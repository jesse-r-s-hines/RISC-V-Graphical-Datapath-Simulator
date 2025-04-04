
import {useRef, useEffect} from "react"
import CSS from "csstype"
import classNames from "classnames"

/** The common id/className/style props */
export type StyleProps = {
    id?: string,
    className?: string,
    style?: CSS.Properties,
}

/**
 * Extracts just the id/className/style props with defaults.
 * Usage:
 * ```ts
 * <Component {...getStyleProps(props, {className: "my-class"})}/>
 * ```
 */
export function getStyleProps(props: StyleProps, defaults: StyleProps = {}): StyleProps {
    const obj: any = {
        id: props.id ?? defaults.id,
        className: classNames(defaults.className, props.className) || undefined, // "" -> undefined
        // avoid creating new objects if unnecessary (try to make objects more stable for react)
        style: (props.style && defaults.style) ? {...defaults.style, ...props.style} : (props.style ?? defaults.style)
    }
    // Remove undefined values
    for (const key in obj) if (obj[key] === undefined) delete obj[key]
    return obj;
}


/**
 * React hook version of useInterval. Handles a changing callback or interval.
 * @param func The function to call every interval
 * @param delay The interval in milliseconds. Set to null to disable interval.
 * 
 * Returns a function that can be used to cancel the timeout explicitly, which can be useful
 * if you need make sure the interval doesn't trigger again before the next react re-render.
 */
export function useInterval(callback: () => void, delay: number|null) {
    const savedCallback = useRef(callback);
    const intervalId = useRef<NodeJS.Timeout>()
  
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);
  
    useEffect(() => {
        if (delay !== null) {
            const id = setInterval(() => savedCallback.current(), delay);
            intervalId.current = id;
            return () => clearInterval(id);
        }
    }, [delay]);

    return () => { clearInterval(intervalId.current) };
}
