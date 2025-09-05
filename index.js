import fs from 'fs/promises'
import * as fontkit from 'fontkit'
import svg2ttf from '@pixi/svg2ttf'
import wawoff2 from 'wawoff2'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const packageInfo = require(require.resolve('./package.json'))

const fontFileName = './material-symbols-outlined.woff2'
const fontFileNameCss = ''
const fontCssRegex = ''

let globalFont

class SVGGlyph {
  constructor(name, code, ligature, width, svg) {
    this.name = name
    this.code = code
    this.ligature = ligature
    this.svg = svg
    this.width = width || 0
  }

  toString(ligature = false) {
    const res = [this.code === 0 ? '<missing-glyph' : '<glyph']
    if (!ligature && this.code === undefined)
      return ''
    if (ligature && !this.name && !this.ligature)
      return ''
    if (this.name)
      res.push('glyph-name="' + this.name.replace(/[^a-zA-Z0-9._-]/g, c => '_') + '"')
    if (this.code !== 0) {
      let unicode = ligature ?
        (this.ligature || this.name) : String.fromCodePoint(this.code || 0)
      if (unicode.length === 1)
        unicode = '&#x' + unicode.charCodeAt(0).toString(16) + ';'
      else
        unicode = unicode.replace(/^\d|[^a-zA-Z0-9._-]/g, c => '&#x' + c.charCodeAt(0).toString(16) + ';')
      res.push('unicode="' + unicode + '"')
    }
    if (this.width)
      res.push('horiz-adv-x="' + this.width + '"')
    res.push('d="' + (this.svg || '') + '"')
    res.push('/>')
    return res.join(' ')
  }
}

async function loadFont(fontBuffer) {
  const buffer = fontBuffer instanceof Buffer ? fontBuffer : await fs.readFile(require.resolve(fontFileName))

  const font = fontkit.create(await wawoff2.decompress(buffer))
  const fontCss = fontFileNameCss && await fs.readFile(require.resolve(fontFileNameCss))

  const codepoints = {}

  if (fontCss && fontCssRegex) {
    for (const m of fontCss.matchAll(fontCssRegex)) {
      if (m.groups)
        codepoints[m.groups.codepoint] = m.groups.id
      else
        codepoints[m[2]] = m[1]
    }
  }

  const svgFont = {
    svgPrefix: '',
    svgSuffix: '',
    id: 'iconfont',
    family: 'Icon Font',
    glyphs: {}
  }

  let minCodePoint = 32
  let maxCodePoint = 32

  const ligatures = {}

  font.GSUB.lookupList.toArray().forEach(entry => {      
    entry.subTables.filter(t => t.lookupType === 4).forEach(subTable => {
      const leadingCharacters = []
      subTable.extension.coverage.rangeRecords.forEach(coverage => {
        for (let i = coverage.start; i <= coverage.end; i++) {
          let character = font.stringsForGlyph(i)[0];
          leadingCharacters.push(character);
        }
      })
      const ligatureSets = subTable.extension.ligatureSets.toArray();
      ligatureSets.forEach((ligatureSet, ligatureSetIndex) => {
        const leadingCharacter = leadingCharacters[ligatureSetIndex]

        ligatureSet.forEach(ligature => {
          const character = font.stringsForGlyph(ligature.glyph)[0]
          if (character) {
            const ligatureText = leadingCharacter + ligature.components.map(x => font.stringsForGlyph(x)[0]).join('')
            ligatures[ligature.glyph] = ligatureText.toLowerCase()
          }
        })
      })
    })
  })

  for (let x = 1, c = 0; x < font.numGlyphs; x++) {
    const glyph = font.getGlyph(x)
    const character = font.stringsForGlyph(x)[0]
    let code = character ? character.charCodeAt(0) : --c
    if (code > 0 && code < minCodePoint)
      minCodePoint = code
    if (code > 0 && code > maxCodePoint)
      maxCodePoint = code
    const name = code > 0 && code < 127 ? String.fromCharCode(code) : glyph.name?.replace(/^_/, '') || 'uni' + '0000'.slice(0, 4 - code.toString(16).length) + code.toString(16)
    svgFont.glyphs[name] = new SVGGlyph(glyph.name || name, code, name.length === 1 ? '' : name, glyph.advanceWidth, glyph.path.toSVG())
    if (code > 126 || code < 0) {
      const name2 = ligatures[x] || name || glyph.name
      if (name2 !== name)
        svgFont.glyphs[name2] = new SVGGlyph(glyph.name || name2, code, name2, glyph.advanceWidth, glyph.path.toSVG())
    }
  }
  if (maxCodePoint < 0xF800)
    maxCodePoint = 0xF800
  maxCodePoint = Object.values(svgFont.glyphs).reduce((maxCode, glyph) => (glyph.code = glyph.code < 0 ? maxCodePoint - glyph.code > 0xFFFF ? undefined : (maxCodePoint - glyph.code) : glyph.code, maxCode < glyph.code ? glyph.code : maxCode), maxCodePoint)

  const uRangeDef = 'U+' + ('0000' + minCodePoint.toString(16)).slice(-4) + '-' + ('0000' + maxCodePoint.toString(16)).slice(-5)
  const bboxDef = font.bbox.minX + "," + font.bbox.minY + "," + font.bbox.maxX + "," + font.bbox.maxY
  const panoseDef = font['OS/2'].panose ? font['OS/2'].panose.join(' ') : '0 0 0 0 0 0 0 0 0 0'
  const weight = font['OS/2'].usWeightClass != null ? '" font-weight="' + font['OS/2'].usWeightClass : ''
  const header = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg xmlns="http://www.w3.org/2000/svg"><metadata></metadata><defs>\n';
  const fontDef = '<font id="' + font.postscriptName + "\" >\n"
  const fontFaceDef = '<font-face font-family="' + font.familyName + '" font-stretch="normal" units-per-em="' + font.unitsPerEm + weight + '" panose-1="' + panoseDef + '" ascent="' + font.ascent + '" descent="' + font.descent + '" x-height="' + font.xHeight + '" underline-thickness="' + font.underlineThickness + '" underline-position="' + font.underlinePosition + '" unicode-range="' + uRangeDef + '" bbox="' + bboxDef + '" />\n'
  const undefGlyph = font.getGlyph(0)

  svgFont.copyright = font.copyright
  svgFont.id = font.postscriptName
  svgFont.fullName = font.fullName
  svgFont.family = font.familyName
  svgFont.license = font.license
  svgFont.version = font.version
  svgFont.description = font.description || font.fullName
  svgFont.url = font.url
  svgFont.svgPrefix = header + fontDef + fontFaceDef + new SVGGlyph(undefGlyph.name, 0, '', undefGlyph.advanceWidth, undefGlyph.path.toSVG()).toString()
  svgFont.svgSuffix = '</font>\n</defs>\n</svg>'
  return svgFont
}

/**
 * @typedef FontOptions
 * @property {Buffer} [font]
 * @property {string[]} [glyphs]
 * @property {string} [fontFamily]
 * @property {string} [fontStyle]
 * @property {string} [fontWeight]
 */

/**
 * Generate woff2 font
 * @param {FontOptions} fontOptions 
 * @returns Promise<Buffer>
 */
export async function generateFont(fontOptions) {
  const includeAll = !fontOptions?.glyphs || (Array.isArray(fontOptions?.glyphs) && fontOptions.glyphs.includes('*'))
  let svgFont
  if (!fontOptions.font)
    svgFont = globalFont
  if (!svgFont) {
    svgFont = await loadFont(fontOptions.font)
    if (!fontOptions.font)
      globalFont = svgFont
  }

  const glyphs = {}, glyphsCode = {}
  if (includeAll) {
    for (const glyph of Object.keys(svgFont.glyphs)) {
      const svgGlyph = svgFont.glyphs[glyph]
      if (svgGlyph.code)
        glyphsCode[svgGlyph.code] = svgGlyph
      if (svgGlyph.ligature)
        glyphs[svgGlyph.ligature] = svgGlyph
    }
  }
  else if (Array.isArray(fontOptions.glyphs)) {
    for (const glyph of fontOptions.glyphs)
      if (glyph in svgFont.glyphs) {
        const svgGlyph = svgFont.glyphs[glyph]
        if (svgGlyph.code)
          glyphsCode[svgGlyph.code] = svgGlyph
        glyphs[glyph] = svgGlyph
      }
  }

  const glyphListCode = Object.values(glyphsCode).sort((a, b) => a.code - b.code),
    glyphList = Object.values(glyphs).sort((a, b) => a.name.localeCompare(b.name))

  const svg = [svgFont.svgPrefix]
  glyphListCode.forEach(glyph => svg.push(glyph.toString()))
  let maxLigaturesSize = 0
  glyphList.forEach(glyph => {
    let skip = includeAll && glyph.ligature.includes('.')
    if (!skip) {
      maxLigaturesSize += (glyph.ligature.length + 2) * 2
      skip = maxLigaturesSize > 65400
    }
    const s = glyph.toString(true)
    if (skip)
      console.log('Skipped: ' + glyph.ligature)
    svg.push(skip ? s.replace(/\s+unicode="[^"]+"/, '') : s)
  })
  console.log('Max ligatures size: ' + maxLigaturesSize)
  svg.push(svgFont.svgSuffix)
  return await wawoff2.compress(svg2ttf(svg.join('\n'), svgFont).buffer)
}

export async function clientBuild(...argv) {
  if (argv.length === 0) {
    console.error('pnpm run build -- <outputFile> [glyphs...]')
    process.exit(1)
  }

  const outputFile = argv[0]
  const glyphs = argv.length > 1 ? argv.slice(1) : undefined
  return fs.writeFile(outputFile, await generateFont({glyphs}))
}

/**
 * Font-Icon optimization plugin
 * @param {IconfontOptions} [fontOptions] - Font-Icon options
 * @returns {import('vite').Plugin}
 */
export function iconfontPlugin(fontOptions) {
  //if (!fontOptions.path)
  //  throw new Error('path is required')

  class Watcher {
    _modules = {}
    _count = 0
    _done = false

    constructor() {
      this.promise = new Promise(resolve => this._resolve = resolve)
    }

    timeout(ms) {
      clearTimeout(this._timeout)
      this._timeout = setTimeout(() => {
        this._done = true
        this._resolve?.()
      }, ms || 2000)
    }

    watch(id) {
      if (!id.includes('node_modules')) {
        this.timeout()
        this._modules[id] = true
        this._count++
      }
    }

    unwatch(id) {
      if (this._modules[id]) {
        delete this._modules[id]
        this._count--
        if (this._count > 0 && !this._done)
          this.timeout()
        if (this._count === 0 && !this._done)
          this.timeout(100)
        return true
      }
    }
  }

  fontOptions = fontOptions || {}

  const watcher = new Watcher()
  watcher.promise = new Promise(resolve => watcher._resolve = resolve)
  let font

  const glyphs = {}
  function addGlyph(id) {
    id = id.trim()
    if (id.startsWith('<'))
      id = id.replace(/<.*?>/g, '').trim()
    if (id.startsWith('fa-') || id.startsWith('fas-') || id.startsWith('fab-') || id.startsWith('far-'))
      id = id.slice(id.indexOf('-') + 1)
    glyphs[id] = true
  }
  function findGlyph(code) {
    code.matchAll(/icon[^}]+[}, ]+"?([\w_-]+)/ig).forEach(m => addGlyph(m[1]))
    code.matchAll(/icon["'\w_.:-]*\s*[=:]\s*['"]?([\w_-]+)/ig).forEach(m => addGlyph(m[1]))
    code.matchAll(/createTextVNode\(["']([^'"]+)/ig).forEach(m => addGlyph(m[1]))
  }

  /**
   * @type {import('vite').Plugin}
   */
  const plugin = {
    name: 'iconfont',
    apply: 'build',

    fontName: fontOptions.fontId || fontOptions.fontName || 'iconfont',

    load(id, opt) {
      if (id.endsWith('.woff2'))
        return
      watcher.watch(id)
    },

    async transform(code, id, opt) {
      if (this.environment.mode !== 'build')
        return code

      if (watcher.unwatch(id))
        findGlyph(code)
      
      if (!id.endsWith('.woff2') && code.includes('data:font/woff2;base64,')) {
        await watcher.promise
        if (Object.keys(glyphs).length) {
          if (!font)
            font = await generateFont({...fontOptions, glyphs: Object.keys(glyphs)})
          if (font.length)
            code = code.replace(/(?<=data:font\/woff2;base64,)[^'")]+/, font.toString('base64'))
        }
      }
      return code
    },

    async generateBundle(options, bundle) {
      console.log('Generate Bundle Iconfont')

      // asset font
      if (!font && Object.keys(glyphs).length) {
        let woffId = 'iconfont.woff2'
        Object.keys(bundle).map(n => {
          if (n.toLowerCase().endsWith('.woff2'))
            woffId = n
        })
        font = await generateFont(fontOptions, Object.keys(glyphs))
        console.log('generate', woffId)
        if (font.length) {
          bundle[woffId]  = {
            name: woffId,
            fileName: woffId,
            type: 'asset',
            needsCodeReference: false,
            originalFileName: null,
            names: [],
            originalFileNames: [],
            source: font
          }
        }
      }
    },
    generateFont
  }
  return plugin
}
