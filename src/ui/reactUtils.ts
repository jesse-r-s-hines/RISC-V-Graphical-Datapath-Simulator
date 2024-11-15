
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