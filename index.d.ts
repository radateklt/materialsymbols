/**
 * Font-Icon options
 */
interface IconfontOptions {
  fontName: string
  path: string
  glyphs: string[]
  fontId?: string
  fontHeight?: number
  fontWeight?: number
  fontStyle?: string
  descent?: number
  ascent?: number
  round?: number
  normalize?: boolean
  preserveAspectRatio?: boolean
  centerHorizontally?: boolean
  centerVertically?: boolean
  usePathBounds?: boolean
  ttf?: object
  codepoint?: number
  codepoints?: {[name: string]: number}
}

/**
 * Font-Icon optimization plugin
 */
export function iconfontPlugin(fontOptions?: IconfontOptions): import('vite').Plugin

/**
 * Generate font
 */
export function generateFont(fontOptions: IconfontOptions): Promise<Buffer>