import { ReactNode } from 'react';

interface ViewportRendererProps {
    readonly width: number;
    readonly height: number;
    readonly active: boolean;
    readonly interactive?: boolean;
    readonly showLabels?: boolean;
    readonly onReady?: () => void;
    readonly onFailure?: (category: 'initialization' | 'context-lost' | 'slow-frames') => void;
    readonly renderExtra?: () => ReactNode;
}

export type { ViewportRendererProps as V };
