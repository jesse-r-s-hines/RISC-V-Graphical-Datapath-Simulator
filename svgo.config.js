// see https://github.com/svg/svgo

module.exports = {
    // js2svg: {
    //     indent:  4,
    //     pretty: true,
    // },
    multipass: true,
    plugins: [
        // required, inkscape uses "style=" and we can't override "style=" with css, but we can override attributes
        "convertStyleToAttrs",            // convert styles into attributes

        // Optimizations
        // Note: since we are manipulating datapath.svg via javascript we have to be careful which optimizations we use.
        //       datapath.svg has unused defs and hidden/empty elements which will be used in javscript, so we can't remove
        //       them, and we can't change the structure of the SVG much.
        "cleanupAttrs",                   // cleanup attributes from newlines, trailing, and repeating spaces
        "mergeStyles",                    // merge multiple style elements into one
        "removeDoctype",                  // remove doctype declaration
        "removeXMLProcInst",              // remove XML processing instructions
        "removeComments",                 // remove comments
        "removeMetadata",                 // remove <metadata>
        "removeTitle",                    // remove <title>
        "removeDesc",                     // remove <desc>
        "removeEditorsNSData",            // remove editors namespaces, elements, and attributes
        "removeEmptyAttrs",               // remove empty attributes
        "minifyStyles",                   // minify <style> elements content with CSSO
        "convertColors",                  // convert colors (from rgb() to #rrggbb, from #rrggbb to #rgb)
        "convertPathData",                // convert Path data to relative or absolute (whichever is shorter), convert one segment to another, trim useless delimiters, smart rounding, and much more
        "convertTransform",               // collapse multiple transforms into one, convert matrices to the short aliases, and much more
        "removeUnknownsAndDefaults",      // remove unknown elements content and attributes, remove attributes with default values
        "removeNonInheritableGroupAttrs", // remove non-inheritable group's "presentation" attributes
        "removeUselessStrokeAndFill",     // remove useless stroke and fill attributes
        "removeUnusedNS",                 // remove unused namespaces declaration
        "cleanupNumericValues",           // round numeric values to the fixed precision, remove default px units
        "moveElemsAttrsToGroup",          // move elements' attributes to their enclosing group
        "moveGroupAttrsToElems",          // move some group attributes to the contained elements
        "sortAttrs",                      // sort element attributes for epic readability
        "sortDefsChildren",               // sort children of <defs> in order to improve compression
        "removeDimensions",               // remove width/height and add viewBox if it's missing (opposite to removeViewBox, disable it first)
    ]
  }