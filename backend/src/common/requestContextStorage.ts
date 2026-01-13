import { createNamespace } from 'cls-hooked'

const requestNamespace = createNamespace('requestNamespace')

export const requestContext = requestNamespace

export function getGlobalRequestId(): number {
    return requestNamespace.get('requestId') as number || 0 
}

export function setGlobalRequestId(requestId: number): void {
    requestNamespace.set('requestId', requestId)
}
