/*!
    Feature Filter by

    (c) mapbox 2016 and maptalks 2018
    www.mapbox.com | www.maptalks.org
    License: MIT, header required.
*/
const types = ['Unknown', 'Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'];

function isObject(obj) {
    return typeof obj === 'object' && !!obj;
}

/**
 * Given a filter expressed as nested arrays, return a new function
 * that evaluates whether a given feature (with a .properties or .tags property)
 * passes its test.
 *
 * @param {Array} filter mapbox gl filter
 * @returns {Function} filter-evaluating function
 */
export function createFilter(filter) {
    return new Function('f', `var p = (f && f.properties || {}); return ${compile(filter)}`);
}

export function isFeatureFilter(filter) {
    if (filter === true || filter === false) {
        return true;
    }
    if (!Array.isArray(filter) || filter.length === 0) {
        return false;
    }
    switch (filter[0]) {
    case 'has':
    case '!has':
        return filter.length === 2 && (typeof filter[1] === 'string' || filter[1].property && filter[1].op);
    case 'in':
    case '!in':
        return filter.length >= 2 && (typeof filter[1] === 'string' || filter[1].property && filter[1].op);
    case '==':
    case '!=':
    case '>':
    case '>=':
    case '<':
    case '<=':
        return filter.length === 3 && (typeof filter[1] === 'string' || filter[1].property && filter[1].op);
    case 'none':
    case 'any':
    case 'all':
        for (const f of filter.slice(1)) {
            if (!isFeatureFilter(f) && typeof f !== 'boolean') {
                return false;
            }
        }
        return true;
    case 'contains':
        return true;
    default:
        return false;
    }
}

function compile(filter) {
    if (!filter) return 'true';
    const op = filter[0];
    if (filter.length <= 1) return op === 'any' ? 'false' : 'true';
    const str =
        op === '==' ? compileComparisonOp(filter[1], filter[2], '===', false) :
            op === '!=' ? compileComparisonOp(filter[1], filter[2], '!==', false) :
                op === '<' ||
                    op === '>' ||
                    op === '<=' ||
                    op === '>=' ? compileComparisonOp(filter[1], filter[2], op, true) :
                    op === 'any' ? compileLogicalOp(filter.slice(1), '||') :
                        op === 'all' ? compileLogicalOp(filter.slice(1), '&&') :
                            op === 'none' ? compileNegation(compileLogicalOp(filter.slice(1), '||')) :
                                op === 'in' ? compileInOp(filter[1], filter.slice(2)) :
                                    op === '!in' ? compileNegation(compileInOp(filter[1], filter.slice(2))) :
                                        op === 'has' ? compileHasOp(filter[1]) :
                                            op === '!has' ? compileNegation(compileHasOp(filter[1])) :
                                                // op === 'test' ? compileRegex(filter[1], filter[2]) :
                                                op === 'contains' ? compileContains(filter[1], filter[2], filter[3]) :
                                                    'true';
    return `(${str})`;
}

function compileFunction(propertyObj, value, op, checkType) {
    const property = propertyObj.property, funName = propertyObj.op;
    let left = compilePropertyReference(property);
    if (funName === 'length') {
        left = `((${left}+='').length)`;
    } else {
        // TODO
        //  other functions
        console.error(`not support ${funName} op`);
        return 'false';
    }
    return getComparisonCode(left, property, value, op, checkType);

}

function compileContains(property, str, index) {
    const prop = compilePropertyReference(property);
    if (index !== undefined) {
        return `(${prop} + '').indexOf("${str}") === ${index}`;
    } else {
        return `(${prop} + '').indexOf("${str}") >= 0`;
    }
}

// function compileRegex(property, regex) {
//     const prop = compilePropertyReference(property);
//     return `new RegExp("${regex}").test(${prop})`;
// }

function compilePropertyReference(property) {
    // const ref =
    //     property === '$type' ? 'f.type' :
    //         property === '$id' ? 'f.id' : `p[${JSON.stringify(property)}]`;
    // return ref;
    return property[0] === '$' ? 'f.' + property.substring(1) : 'p[' + JSON.stringify(property) + ']';
}

function compileComparisonOp(property, value, op, checkType) {
    if (isObject(property) && property.op) {
        return compileFunction(property, value, op, checkType);
    }
    const left = compilePropertyReference(property);
    return getComparisonCode(left, property, value, op, checkType);
}

function getComparisonCode(left, property, value, op, checkType) {
    const right = property === '$type' ? types.indexOf(value) : JSON.stringify(value);
    return (checkType ? `typeof ${left}=== typeof ${right}&&` : '') + left + op + right;
}

function compileLogicalOp(expressions, op) {
    return expressions.map(compile).join(op);
}

function compileInOp(property, values) {
    if (property === '$type') values = values.map((value) => {
        return types.indexOf(value);
    });
    const left = JSON.stringify(values.sort(compare));
    const right = compilePropertyReference(property);

    if (values.length <= 200) return `${left}.indexOf(${right}) !== -1`;

    return `function(v, a, i, j) {
        while (i <= j) { var m = (i + j) >> 1;
            if (a[m] === v) return true; if (a[m] > v) j = m - 1; else i = m + 1;
        }
    return false; }(${right}, ${left},0,${values.length - 1})`;
}

function compileHasOp(property) {
    return property === '$id' ? '"id" in f' : `${JSON.stringify(property)} in p`;
}

function compileNegation(expression) {
    return `!(${expression})`;
}

// Comparison function to sort numbers and strings
function compare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Get feature object from a geometry for filter functions.
 * @param  {Geometry} geometry geometry
 * @return {Object}          feature for filter functions
 */
export function getFilterFeature(geometry) {
    const json = geometry._toJSON(),
        g = json['feature'];
    g['type'] = types.indexOf(g['geometry']['type']);
    g['subType'] = json['subType'];
    return g;
}

/**
 * Compile layer's style, styles to symbolize layer's geometries, e.g.<br>
 * <pre>
 * [
 *   {
 *     'filter' : ['==', 'foo', 'val'],
 *     'symbol' : {'markerFile':'foo.png'}
 *   }
 * ]
 * </pre>
 * @param  {Object|Object[]} styles - style to compile
 * @return {Object[]}       compiled styles
 */
export function compileStyle(styles) {
    if (!Array.isArray(styles)) {
        return compileStyle([styles]);
    }
    const compiled = [];
    for (let i = 0; i < styles.length; i++) {
        let filter;
        if (styles[i]['filter'] === true) {
            filter = function () { return true; };
        } else {
            filter = createFilter(styles[i]['filter']);
        }
        compiled.push(extend({}, styles[i], {
            filter: filter
        }));
    }
    return compiled;
}

function extend(dest) { // (Object[, Object, ...]) ->
    for (let i = 1; i < arguments.length; i++) {
        const src = arguments[i];
        for (const k in src) {
            dest[k] = src[k];
        }
    }
    return dest;
}
