declare module 'framer-motion' {
    import * as React from 'react'

    export type MotionProps = {
        initial?: any
        animate?: any
        exit?: any
        whileHover?: any
        layout?: boolean | "position" | "size"
        layoutId?: string
        transition?: any
        variants?: any
        className?: string
        style?: React.CSSProperties
        [key: string]: any
    }

    export type MotionComponent<P = {}> = React.ComponentType<P & MotionProps>

    export const motion: {
        [K in keyof JSX.IntrinsicElements]: MotionComponent<JSX.IntrinsicElements[K]>
    }

    export const AnimatePresence: React.FC<{
        children?: React.ReactNode
        mode?: "sync" | "wait" | "popLayout"
        initial?: boolean
        onExitComplete?: () => void
    }>
}