<script lang="ts">
import { h, defineComponent } from "vue"
import type { App, Plugin } from "vue"
import './iconfont.woff2'

const Icon = defineComponent({
  name: "Icon",
  props: {
    value: String,
    filled: {
      type: Boolean,
      default: false
    }
  },
  setup (props, ctx) {
    return () => h("i", { class: props.filled ? "icon-filled" : "icon" }, props.value || ctx.slots)
  },
  install (app: App) {
    app.component("Icon", this)
  }
})

export default Icon as typeof Icon & Plugin
</script>

<style>
@font-face {
  font-family: "Material Symbols";
  font-style: normal;
  font-weight: 700;
  src: url(iconfont.woff2) format("woff2");
}
.icon, .icon-filled {
  font-family: "Material Symbols";
  font-weight: normal;
  font-style: normal;
  max-width: 2rem;
  width: 1.25rem;
  text-align: center;
  overflow: hidden;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  line-height: 1;
  font-feature-settings: "liga";
  vertical-align: middle;
  font-display: block;
}
.icon-filled {
  font-variation-settings: 'FILL' 1;
}
</style>
