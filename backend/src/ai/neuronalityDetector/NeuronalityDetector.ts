import emojiRegex from "emoji-regex";

interface DetectionResult {
  score: number;
  confidence: number;
  verdict: "human" | "ai" | "uncertain";
  features: {
    [featureName: string]: {
      count: number;
      weight: number;
      contribution: number;
    };
  };
}

interface FeatureDetector {
  name: string;
  weight: number;
  detect: (text: string) => number;
}

class NeuronalityDetector {
  private features: FeatureDetector[] = [
    // Emoji в деловом/информационном тексте
    {
      name: "emoji_in_formal_context",
      weight: 0.15,
      detect: (text: string): number => {
        const regex = emojiRegex();
        const matches = text.match(regex);
        return matches ? matches.length : 0;
      }
    },

    // Длинные тире (em dash, figure dash, minus sign)
    {
      name: "long_dashes",
      weight: 0.12,
      detect: (text: string): number => {
        const longDashRegex = /[—―−]/g;
        const matches = text.match(longDashRegex);
        return matches ? matches.length : 0;
      }
    },

    // Умные кавычки (типографские)
    {
      name: "smart_quotes",
      weight: 0.10,
      detect: (text: string): number => {
        const smartQuotesRegex = /[""''«»]/g;
        const matches = text.match(smartQuotesRegex);
        return matches ? matches.length : 0;
      }
    },

    // Zero Width Space (U+200B)
    {
      name: "zero_width_space",
      weight: 0.20,
      detect: (text: string): number => {
        const zwsRegex = /\u200B/g;
        const matches = text.match(zwsRegex);
        return matches ? matches.length : 0;
      }
    },

    // Zero Width Joiner / Non-Joiner
    {
      name: "zero_width_joiner_nonjoiner",
      weight: 0.18,
      detect: (text: string): number => {
        const zwjRegex = /[\u200C\u200D]/g;
        const matches = text.match(zwjRegex);
        return matches ? matches.length : 0;
      }
    },

    // Soft hyphen (U+00AD)
    {
      name: "soft_hyphen",
      weight: 0.16,
      detect: (text: string): number => {
        const softHyphenRegex = /\u00AD/g;
        const matches = text.match(softHyphenRegex);
        return matches ? matches.length : 0;
      }
    },

    // Non-breaking space (U+00A0)
    {
      name: "non_breaking_space",
      weight: 0.08,
      detect: (text: string): number => {
        const nbspRegex = /\u00A0/g;
        const matches = text.match(nbspRegex);
        return matches ? matches.length : 0;
      }
    },

    // Directional marks (LTR, RTL, embedding)
    {
      name: "directional_marks",
      weight: 0.22,
      detect: (text: string): number => {
        const dirMarksRegex = /[\u200E\u200F\u202A\u202B\u202C\u202D\u202E]/g;
        const matches = text.match(dirMarksRegex);
        return matches ? matches.length : 0;
      }
    },

    // Unicode variation selectors
    {
      name: "variation_selectors",
      weight: 0.19,
      detect: (text: string): number => {
        const variationRegex = /[\uFE00-\uFE0F]/g;
        const matches = text.match(variationRegex);
        return matches ? matches.length : 0;
      }
    },

    // Полноширинная пунктуация (fullwidth)
    {
      name: "fullwidth_punctuation",
      weight: 0.14,
      detect: (text: string): number => {
        const fullwidthRegex = /[！？，。；：]/g;
        const matches = text.match(fullwidthRegex);
        return matches ? matches.length : 0;
      }
    },

    // Необычная пунктуация (интерробанг, перевёрнутые знаки)
    {
      name: "unusual_punctuation",
      weight: 0.11,
      detect: (text: string): number => {
        const unusualRegex = /[‽⸘¿¡※]/g;
        const matches = text.match(unusualRegex);
        return matches ? matches.length : 0;
      }
    },

    // Нестандартные пробелы (em space, en space, thin space, hair space, etc.)
    {
      name: "non_standard_spaces",
      weight: 0.13,
      detect: (text: string): number => {
        const spaceRegex = /[\u2000-\u200A\u202F\u205F]/g;
        const matches = text.match(spaceRegex);
        return matches ? matches.length : 0;
      }
    },

    // Markdown-стиль жирного текста (**текст**)
    {
      name: "markdown_bold",
      weight: 0.09,
      detect: (text: string): number => {
        const boldRegex = /\*\*[^*]+\*\*/g;
        const matches = text.match(boldRegex);
        return matches ? matches.length : 0;
      }
    },

    // Маркированные списки
    {
      name: "bullet_lists",
      weight: 0.10,
      detect: (text: string): number => {
        const bulletRegex = /^[\s]*[•●○▪▫■□‣⁃◦⦾⦿][\s]+/gm;
        const matches = text.match(bulletRegex);
        return matches ? matches.length : 0;
      }
    },

    // Нумерованные списки
    {
      name: "numbered_lists",
      weight: 0.08,
      detect: (text: string): number => {
        const numberedRegex = /^[\s]*\d+[\.)]\s+/gm;
        const matches = text.match(numberedRegex);
        return matches ? matches.length : 0;
      }
    },

    // Линии-разделители (---, ___, ***)
    {
      name: "separator_lines",
      weight: 0.12,
      detect: (text: string): number => {
        const separatorRegex = /^[\s]*[-_*]{3,}[\s]*$/gm;
        const matches = text.match(separatorRegex);
        return matches ? matches.length : 0;
      }
    },

    // Повторяющиеся структурные паттерны (одинаковые начала строк)
    {
      name: "repeated_line_patterns",
      weight: 0.11,
      detect: (text: string): number => {
        const lines = text.split("\n").filter(line => line.trim().length > 0);
        if (lines.length < 3) return 0;

        const patterns = new Map<string, number>();
        for (const line of lines) {
          const prefix = line.trim().substring(0, 20);
          patterns.set(prefix, (patterns.get(prefix) || 0) + 1);
        }

        let repeatedCount = 0;
        for (const count of patterns.values()) {
          if (count >= 3) repeatedCount += count;
        }

        return repeatedCount;
      }
    },

    // Абзацы примерно одинаковой длины (признак шаблонности)
    {
      name: "uniform_paragraph_length",
      weight: 0.07,
      detect: (text: string): number => {
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50);
        if (paragraphs.length < 3) return 0;

        const lengths = paragraphs.map(p => p.length);
        const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / avg;

        // Низкий коэффициент вариации указывает на однородность
        return coefficientOfVariation < 0.3 ? paragraphs.length : 0;
      }
    },

    // Специальные маркеры Unicode (combining marks, diacritics в необычных местах)
    {
      name: "combining_marks",
      weight: 0.15,
      detect: (text: string): number => {
        const combiningRegex = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g;
        const matches = text.match(combiningRegex);
        return matches ? matches.length : 0;
      }
    },

    // Символы-разделители блоков (block elements)
    {
      name: "block_elements",
      weight: 0.10,
      detect: (text: string): number => {
        const blockRegex = /[▀▁▂▃▄▅▆▇█▉▊▋▌▍▎▏▐░▒▓▔▕■□▢▣▤▥▦▧▨▩▪▫▬▭▮▯]/g;
        const matches = text.match(blockRegex);
        return matches ? matches.length : 0;
      }
    }
  ];

  detect(text: string): DetectionResult {
    const features: DetectionResult["features"] = {};
    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Вычисляем вклад каждого признака
    for (const feature of this.features) {
      const count = feature.detect(text);

      // Нормализуем count относительно длины текста
      const textLength = text.length || 1;
      const normalizedCount = Math.min(count / (textLength / 1000), 10);

      // Вклад = вес * нормализованное количество
      const contribution = feature.weight * Math.tanh(normalizedCount / 2);

      features[feature.name] = {
        count,
        weight: feature.weight,
        contribution
      };

      totalWeightedScore += contribution;
      totalWeight += feature.weight;
    }

    // Нормализуем итоговый score к диапазону 0..1
    const score = Math.min(totalWeightedScore / totalWeight, 1);

    // Вычисляем уверенность на основе разброса вкладов
    const contributions = Object.values(features).map(f => f.contribution);
    const avgContribution = contributions.reduce((a, b) => a + b, 0) / contributions.length;
    const variance = contributions.reduce((sum, c) => sum + Math.pow(c - avgContribution, 2), 0) / contributions.length;
    const confidence = Math.min(0.3 + (variance * 5), 1);

    // Определяем вердикт
    let verdict: "human" | "ai" | "uncertain";
    if (score < 0.35) {
      verdict = "human";
    } else if (score > 0.65) {
      verdict = "ai";
    } else {
      verdict = "uncertain";
    }

    return {
      score,
      confidence,
      verdict,
      features
    };
  }
}

export default new NeuronalityDetector();

/*
Этот модуль является эвристическим детектором и
не претендует на абсолютную точность.
Он используется исключительно в исследовательских целях
в рамках дипломной работы.
*/