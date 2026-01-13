# -*- coding: utf-8 -*-
"""
AI / Human Text Detector (RU + KZ) — First Version
--------------------------------------------------
Single-file, OOP-style training script for a simple neural network (GRU-based)
that predicts probability of AI-generated text in [0..1].

Usage:
    python train_ai_detector.py --caps capArticles.json --real realArticles.json \
        --epochs 6 --batch_size 64 --max_vocab 50000 --max_len 512

Artifacts saved:
    - model.pt         : trained PyTorch model weights
    - vocab.json       : token -> index mapping
    - config.json      : training config and label mapping

Author: your_name
"""

import argparse
import json
import math
import os
import random
import re
import time
from dataclasses import dataclass, asdict
from typing import List, Tuple, Dict, Any

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from torch.utils.data import Dataset, DataLoader
from tqdm import tqdm


# -------------------------
# Utilities
# -------------------------

def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


class Timer:
    def __init__(self, title: str = ""):
        self.title = title
        self.start_ts = None
        self.elapsed = 0.0

    def __enter__(self):
        self.start_ts = time.time()
        if self.title:
            print(f"[TIMER] {self.title} ...")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed = time.time() - self.start_ts
    def pretty(self) -> str:
        sec = self.elapsed
        if sec < 60:
            return f"{sec:.2f}s"
        m = int(sec // 60)
        s = sec - m * 60
        return f"{m}m {s:.1f}s"


# -------------------------
# Config
# -------------------------

@dataclass
class TrainConfig:
    caps_path: str
    real_path: str
    epochs: int = 6
    batch_size: int = 64
    lr: float = 2e-3
    max_vocab: int = 50000
    min_freq: int = 2
    max_len: int = 512
    valid_split: float = 0.15
    test_split: float = 0.15
    seed: int = 42
    device: str = "cuda" if torch.cuda.is_available() else "cpu"
    save_dir: str = "./artifacts"
    model_type: str = "gru"  # reserved for future variants


# -------------------------
# Text processing
# -------------------------

class TextCleaner:
    URL_RE = re.compile(r"https?://\S+|www\.\S+")
    TAG_RE = re.compile(r"<[^>]+>")
    MULTISPACE_RE = re.compile(r"\s+")

    @staticmethod
    def clean(text: str) -> str:
        if not isinstance(text, str):
            return ""
        t = text
        t = TextCleaner.TAG_RE.sub(" ", t)
        t = TextCleaner.URL_RE.sub(" ", t)
        t = t.replace("\u00a0", " ")
        t = TextCleaner.MULTISPACE_RE.sub(" ", t)
        return t.strip().lower()


class SimpleTokenizer:
    """
    Space-based tokenizer suitable for RU/KZ baseline.
    Later you can swap to SentencePiece/BPE without changing other code.
    """
    def __init__(self):
        self.special_tokens = {
            "<pad>": 0,
            "<unk>": 1,
            "<bos>": 2,
            "<eos>": 3
        }
        self.token2idx: Dict[str, int] = dict(self.special_tokens)
        self.idx2token: List[str] = [None] * len(self.special_tokens)
        for tok, idx in self.special_tokens.items():
            self.idx2token[idx] = tok
        self.frozen = False

    def build_vocab(self, texts: List[str], max_vocab: int = 50000, min_freq: int = 2):
        freq: Dict[str, int] = {}
        for t in texts:
            for tok in t.split():
                freq[tok] = freq.get(tok, 0) + 1
        # sort by freq desc, then alphabetically
        items = sorted(freq.items(), key=lambda x: (-x[1], x[0]))
        added = 0
        for tok, cnt in items:
            if cnt < min_freq:
                continue
            if tok in self.token2idx:
                continue
            self.token2idx[tok] = len(self.token2idx)
            self.idx2token.append(tok)
            added += 1
            if len(self.token2idx) >= max_vocab:
                break
        self.frozen = True

    def encode(self, text: str, add_special: bool = True, max_len: int = 512) -> List[int]:
        toks = text.split()
        ids = []
        if add_special:
            ids.append(self.special_tokens["<bos>"])
        for tok in toks:
            ids.append(self.token2idx.get(tok, self.special_tokens["<unk>"]))
            if len(ids) >= (max_len - (1 if add_special else 0)):
                break
        if add_special:
            ids.append(self.special_tokens["<eos>"])
        return ids

    def pad_id(self) -> int:
        return self.special_tokens["<pad>"]

    def to_json(self) -> Dict[str, Any]:
        return {
            "token2idx": self.token2idx,
            "idx2token": self.idx2token
        }

    @staticmethod
    def from_json(obj: Dict[str, Any]) -> "SimpleTokenizer":
        tok = SimpleTokenizer()
        tok.token2idx = obj["token2idx"]
        tok.idx2token = obj["idx2token"]
        tok.frozen = True
        return tok


# -------------------------
# Data loading
# -------------------------

def load_articles_json(path: str) -> Dict[str, List[Dict[str, Any]]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Expect keys "ru" and/or "kz"
    return data


def extract_texts_from_caps(data: Dict[str, Any]) -> List[str]:
    # capArticles.json structure:
    # {
    #   "ru": [ {"title":"...", "text":"...", "source":"..."}, ... ],
    #   "kz": [ ... ]
    # }
    texts = []
    for lang_key in ("ru", "kz"):
        for item in data.get(lang_key, []):
            txt = item.get("text", "")
            texts.append(TextCleaner.clean(txt))
    return texts


def extract_texts_from_real(data: Dict[str, Any]) -> List[str]:
    # realArticles.json structure:
    # {
    #   "ru": [ {"text":"...", "link":"..."}, ... ],
    #   "kz": [ ... ]
    # }
    texts = []
    for lang_key in ("ru", "kz"):
        for item in data.get(lang_key, []):
            txt = item.get("text", "")
            texts.append(TextCleaner.clean(txt))
    return texts


class ArticleDataset(Dataset):
    def __init__(self, texts: List[str], labels: List[int], tokenizer: SimpleTokenizer, max_len: int):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx: int):
        text = self.texts[idx]
        label = self.labels[idx]
        ids = self.tokenizer.encode(text, add_special=True, max_len=self.max_len)
        return torch.tensor(ids, dtype=torch.long), torch.tensor(label, dtype=torch.float32)


def collate_batch(batch, pad_id: int):
    # batch: List[(ids_tensor, label_tensor)]
    ids_list, lbl_list = zip(*batch)
    lengths = [len(x) for x in ids_list]
    max_len = max(lengths)
    padded = []
    for x in ids_list:
        if len(x) < max_len:
            pad = torch.full((max_len - len(x),), pad_id, dtype=torch.long)
            padded.append(torch.cat([x, pad], dim=0))
        else:
            padded.append(x)
    inputs = torch.stack(padded, dim=0)           # [B, T]
    labels = torch.stack(lbl_list, dim=0)         # [B]
    lengths = torch.tensor(lengths, dtype=torch.long)
    return inputs, labels, lengths


# -------------------------
# Model
# -------------------------

class AIDetectorGRU(nn.Module):
    def __init__(self, vocab_size: int, embed_dim: int = 256, hidden_dim: int = 256, num_layers: int = 1, dropout: float = 0.2, pad_idx: int = 0):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=pad_idx)
        self.gru = nn.GRU(embed_dim, hidden_dim, num_layers=num_layers, batch_first=True, bidirectional=True, dropout=dropout if num_layers > 1 else 0.0)
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_dim * 2, 1)  # bidirectional
        # BCEWithLogitsLoss expects logits; we won't put sigmoid here
        # Sigmoid will be applied only at inference time for probabilities

    def forward(self, x, lengths=None):
        emb = self.embedding(x)  # [B, T, D]
        # Optionally pack sequences for speed (not strictly needed for baseline)
        out, _ = self.gru(emb)   # [B, T, 2H]
        # Take the last timestep (mask by lengths if you want exact last)
        last_hidden = out[:, -1, :]  # [B, 2H]
        last_hidden = self.dropout(last_hidden)
        logits = self.fc(last_hidden).squeeze(1)  # [B]
        return logits  # raw logits


# -------------------------
# Trainer
# -------------------------

class Trainer:
    def __init__(self, cfg: TrainConfig, model: nn.Module):
        self.cfg = cfg
        self.model = model.to(cfg.device)
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=cfg.lr)

    @staticmethod
    def _metrics(y_true: np.ndarray, y_prob: np.ndarray) -> Dict[str, float]:
        y_pred = (y_prob >= 0.5).astype(int)
        out = {
            "accuracy": float(accuracy_score(y_true, y_pred)),
            "f1": float(f1_score(y_true, y_pred)),
        }
        try:
            out["roc_auc"] = float(roc_auc_score(y_true, y_prob))
        except Exception:
            out["roc_auc"] = float("nan")
        return out

    def _run_epoch(self, loader: DataLoader, criterion: nn.Module, train: bool = True) -> Tuple[float, Dict[str, float]]:
        epoch_loss = 0.0
        all_probs = []
        all_true = []
        if train:
            self.model.train()
        else:
            self.model.eval()

        bar = tqdm(loader, desc="train" if train else "valid", leave=False)
        for batch in bar:
            inputs, labels, lengths = [b.to(self.cfg.device) for b in batch]
            if train:
                self.optimizer.zero_grad()
            logits = self.model(inputs, lengths=lengths)
            loss = criterion(logits, labels)
            if train:
                loss.backward()
                nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
                self.optimizer.step()
            epoch_loss += loss.item() * inputs.size(0)

            probs = torch.sigmoid(logits).detach().cpu().numpy()
            all_probs.append(probs)
            all_true.append(labels.detach().cpu().numpy())

            bar.set_postfix(loss=loss.item())

        y_prob = np.concatenate(all_probs)
        y_true = np.concatenate(all_true).astype(int)
        metrics = self._metrics(y_true, y_prob)
        avg_loss = epoch_loss / len(loader.dataset)
        return avg_loss, metrics

    def fit(self, train_loader: DataLoader, valid_loader: DataLoader, epochs: int):
        criterion = nn.BCEWithLogitsLoss()
        best_f1 = -1.0
        best_state = None

        with Timer("Training"):
            for ep in range(1, epochs + 1):
                print(f"\n[Epoch {ep}/{epochs}]")
                with Timer("Epoch time") as et:
                    train_loss, train_metrics = self._run_epoch(train_loader, criterion, train=True)
                    valid_loss, valid_metrics = self._run_epoch(valid_loader, criterion, train=False)
                print(f"  -> train: loss={train_loss:.4f} acc={train_metrics['accuracy']:.4f} f1={train_metrics['f1']:.4f} auc={valid_metrics.get('roc_auc', float('nan')):.4f}")
                print(f"  -> valid: loss={valid_loss:.4f} acc={valid_metrics['accuracy']:.4f} f1={valid_metrics['f1']:.4f} auc={valid_metrics.get('roc_auc', float('nan')):.4f}")
                print(f"  -> epoch time: {et.pretty()}")

                if valid_metrics["f1"] > best_f1:
                    best_f1 = valid_metrics["f1"]
                    best_state = {k: v.cpu() for k, v in self.model.state_dict().items()}
                    print("  [*] New best model (by F1) saved in memory.")

        if best_state is not None:
            self.model.load_state_dict(best_state)
            print(f"[OK] Best model (F1={best_f1:.4f}) restored.")

    def test(self, test_loader: DataLoader) -> Dict[str, float]:
        self.model.eval()
        all_probs = []
        all_true = []
        bar = tqdm(test_loader, desc="test", leave=False)
        with torch.no_grad():
            for batch in bar:
                inputs, labels, lengths = [b.to(self.cfg.device) for b in batch]
                logits = self.model(inputs, lengths=lengths)
                probs = torch.sigmoid(logits).detach().cpu().numpy()
                all_probs.append(probs)
                all_true.append(labels.detach().cpu().numpy())

        y_prob = np.concatenate(all_probs)
        y_true = np.concatenate(all_true).astype(int)
        metrics = self._metrics(y_true, y_prob)
        print(f"[TEST] acc={metrics['accuracy']:.4f} f1={metrics['f1']:.4f} auc={metrics.get('roc_auc', float('nan')):.4f}")
        return metrics


# -------------------------
# Data split helper
# -------------------------

def split_data(texts: List[str], labels: List[int], valid_split: float, test_split: float, seed: int) -> Tuple[List[int], List[int], List[int]]:
    n = len(texts)
    idxs = list(range(n))
    random.Random(seed).shuffle(idxs)
    n_test = int(n * test_split)
    n_valid = int(n * valid_split)
    test_idx = idxs[:n_test]
    valid_idx = idxs[n_test:n_test + n_valid]
    train_idx = idxs[n_test + n_valid:]
    return train_idx, valid_idx, test_idx


# -------------------------
# Save/Load helpers
# -------------------------

def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def save_json(path: str, obj: Any):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def save_model(save_dir: str, model: nn.Module, tokenizer: SimpleTokenizer, cfg: TrainConfig):
    ensure_dir(save_dir)
    torch.save(model.state_dict(), os.path.join(save_dir, "model.pt"))
    save_json(os.path.join(save_dir, "vocab.json"), tokenizer.to_json())
    save_json(os.path.join(save_dir, "config.json"), asdict(cfg))
    print(f"[SAVE] Artifacts saved to: {save_dir}")


# -------------------------
# Main pipeline
# -------------------------

def build_and_run(cfg: TrainConfig):
    set_seed(cfg.seed)
    ensure_dir(cfg.save_dir)

    # 1) Load data
    with Timer("Loading JSON data") as t_load:
        caps_raw = load_articles_json(cfg.caps_path)
        real_raw = load_articles_json(cfg.real_path)
    print(f"[OK] JSON loaded in {t_load.pretty()}.")

    # 2) Extract texts and labels
    with Timer("Extract & clean") as t_clean:
        caps_texts = extract_texts_from_caps(caps_raw)
        real_texts = extract_texts_from_real(real_raw)
        labels_caps = [1] * len(caps_texts)   # AI = 1
        labels_real = [0] * len(real_texts)   # Human = 0
        texts = caps_texts + real_texts
        labels = labels_caps + labels_real
    print(f"[OK] Texts prepared: total={len(texts)} (AI={len(caps_texts)} | Human={len(real_texts)}) in {t_clean.pretty()}.")

    # Guard against empty
    if len(texts) == 0:
        raise ValueError("No texts loaded. Check input JSON files.")

    # 3) Build tokenizer/vocab on all texts
    with Timer("Building vocab") as t_vocab:
        tokenizer = SimpleTokenizer()
        tokenizer.build_vocab(texts, max_vocab=cfg.max_vocab, min_freq=cfg.min_freq)
    print(f"[OK] Vocab size: {len(tokenizer.token2idx)} in {t_vocab.pretty()}.")

    # 4) Split
    train_idx, valid_idx, test_idx = split_data(texts, labels, cfg.valid_split, cfg.test_split, cfg.seed)

    def subset(idxs):
        return [texts[i] for i in idxs], [labels[i] for i in idxs]

    train_texts, train_labels = subset(train_idx)
    valid_texts, valid_labels = subset(valid_idx)
    test_texts, test_labels = subset(test_idx)

    # 5) Datasets / Loaders
    train_ds = ArticleDataset(train_texts, train_labels, tokenizer, cfg.max_len)
    valid_ds = ArticleDataset(valid_texts, valid_labels, tokenizer, cfg.max_len)
    test_ds = ArticleDataset(test_texts, test_labels, tokenizer, cfg.max_len)

    pad_id = tokenizer.pad_id()
    train_loader = DataLoader(train_ds, batch_size=cfg.batch_size, shuffle=True,
                              collate_fn=lambda b: collate_batch(b, pad_id))
    valid_loader = DataLoader(valid_ds, batch_size=cfg.batch_size, shuffle=False,
                              collate_fn=lambda b: collate_batch(b, pad_id))
    test_loader = DataLoader(test_ds, batch_size=cfg.batch_size, shuffle=False,
                             collate_fn=lambda b: collate_batch(b, pad_id))

    # 6) Model
    model = AIDetectorGRU(
        vocab_size=len(tokenizer.token2idx),
        embed_dim=256,
        hidden_dim=256,
        num_layers=1,
        dropout=0.2,
        pad_idx=pad_id
    )

    # 7) Train
    trainer = Trainer(cfg, model)
    trainer.fit(train_loader, valid_loader, epochs=cfg.epochs)

    # 8) Test
    with Timer("Testing") as t_test:
        metrics = trainer.test(test_loader)
    print(f"[OK] Test finished in {t_test.pretty()}.")

    # 9) Save
    save_model(cfg.save_dir, trainer.model, tokenizer, cfg)
    print("[DONE] Training pipeline complete.")


# -------------------------
# Entry
# -------------------------

def parse_args() -> TrainConfig:
    parser = argparse.ArgumentParser(description="Train AI Text Detector (RU + KZ)")
    parser.add_argument("--caps", dest="caps_path", type=str, required=True, help="Path to capArticles.json (AI texts)")
    parser.add_argument("--real", dest="real_path", type=str, required=True, help="Path to realArticles.json (Human texts)")
    parser.add_argument("--epochs", type=int, default=6)
    parser.add_argument("--batch_size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=2e-3)
    parser.add_argument("--max_vocab", type=int, default=50000)
    parser.add_argument("--min_freq", type=int, default=2)
    parser.add_argument("--max_len", type=int, default=512)
    parser.add_argument("--valid_split", type=float, default=0.15)
    parser.add_argument("--test_split", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--save_dir", type=str, default="./artifacts")
    args = parser.parse_args()
    return TrainConfig(
        caps_path=args.caps_path,
        real_path=args.real_path,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        max_vocab=args.max_vocab,
        min_freq=args.min_freq,
        max_len=args.max_len,
        valid_split=args.valid_split,
        test_split=args.test_split,
        seed=args.seed,
        save_dir=args.save_dir
    )


if __name__ == "__main__":
    cfg = parse_args()
    build_and_run(cfg)
