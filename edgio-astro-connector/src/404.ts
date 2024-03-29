// Inspired from https://www.gatsbyjs.com/404 and https://www.figma.com/file/eehzYI7JkNJ7svN7CxVTaS/Gatsby-Custom-404-Page?node-id=0%3A1
// Built with Tailwind Play: https://play.tailwindcss.com/vbi76gjqqb

export const notFoundPageHTML = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>404: Not Found</title>
    <meta content="width=device-width,initial-scale=1.0" name="viewport">
    <style>
      *,
      ::before,
      ::after {
        box-sizing: border-box;
        /* 1 */
        border-width: 0;
        /* 2 */
        border-style: solid;
        /* 2 */
        border-color: #e5e7eb;
        /* 2 */
      }
      
      ::before,
      ::after {
        --tw-content: '';
      }
      
      html {
        line-height: 1.5;
        /* 1 */
        -webkit-text-size-adjust: 100%;
        /* 2 */
        -moz-tab-size: 4;
        /* 3 */
        tab-size: 4;
        /* 3 */
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
        /* 4 */
      }
      
      body {
        margin: 0;
        /* 1 */
        line-height: inherit;
        /* 2 */
      }
      
      hr {
        height: 0;
        /* 1 */
        color: inherit;
        /* 2 */
        border-top-width: 1px;
        /* 3 */
      }
      
      /*
      Add the correct text decoration in Chrome, Edge, and Safari.
      */
      
      abbr:where([title]) {
        -webkit-text-decoration: underline dotted;
                text-decoration: underline dotted;
      }
      
      /*
      Remove the default font size and weight for headings.
      */
      
      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        font-size: inherit;
        font-weight: inherit;
      }
      
      /*
      Reset links to optimize for opt-in styling instead of opt-out.
      */
      
      a {
        color: inherit;
        text-decoration: inherit;
      }
      
      /*
      Add the correct font weight in Edge and Safari.
      */
      
      b,
      strong {
        font-weight: bolder;
      }
      
      code,
      kbd,
      samp,
      pre {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        /* 1 */
        font-size: 1em;
        /* 2 */
      }
      
      /*
      Add the correct font size in all browsers.
      */
      
      small {
        font-size: 80%;
      }
      
      sub,
      sup {
        font-size: 75%;
        line-height: 0;
        position: relative;
        vertical-align: baseline;
      }
      
      sub {
        bottom: -0.25em;
      }
      
      sup {
        top: -0.5em;
      }

      table {
        text-indent: 0;
        /* 1 */
        border-color: inherit;
        /* 2 */
        border-collapse: collapse;
        /* 3 */
      }
      
      /*
      1. Change the font styles in all browsers.
      2. Remove the margin in Firefox and Safari.
      3. Remove default padding in all browsers.
      */
      
      button,
      input,
      optgroup,
      select,
      textarea {
        font-family: inherit;
        /* 1 */
        font-size: 100%;
        /* 1 */
        font-weight: inherit;
        /* 1 */
        line-height: inherit;
        /* 1 */
        color: inherit;
        /* 1 */
        margin: 0;
        /* 2 */
        padding: 0;
        /* 3 */
      }
      
      /*
      Remove the inheritance of text transform in Edge and Firefox.
      */
      
      button,
      select {
        text-transform: none;
      }
      
      /*
      1. Correct the inability to style clickable types in iOS and Safari.
      2. Remove default button styles.
      */
      
      button,
      [type='button'],
      [type='reset'],
      [type='submit'] {
        -webkit-appearance: button;
        /* 1 */
        background-color: transparent;
        /* 2 */
        background-image: none;
        /* 2 */
      }
      
      /*
      Use the modern Firefox focus style for all focusable elements.
      */
      
      :-moz-focusring {
        outline: auto;
      }
      
      :-moz-ui-invalid {
        box-shadow: none;
      }
      
      /*
      Add the correct vertical alignment in Chrome and Firefox.
      */
      
      progress {
        vertical-align: baseline;
      }
      
      /*
      Correct the cursor style of increment and decrement buttons in Safari.
      */
      
      ::-webkit-inner-spin-button,
      ::-webkit-outer-spin-button {
        height: auto;
      }
      
      /*
      1. Correct the odd appearance in Chrome and Safari.
      2. Correct the outline style in Safari.
      */
      
      [type='search'] {
        -webkit-appearance: textfield;
        /* 1 */
        outline-offset: -2px;
        /* 2 */
      }
      
      /*
      Remove the inner padding in Chrome and Safari on macOS.
      */
      
      ::-webkit-search-decoration {
        -webkit-appearance: none;
      }
      
      ::-webkit-file-upload-button {
        -webkit-appearance: button;
        /* 1 */
        font: inherit;
        /* 2 */
      }
      
      /*
      Add the correct display in Chrome and Safari.
      */
      
      summary {
        display: list-item;
      }
      
      /*
      Removes the default spacing and border for appropriate elements.
      */
      
      blockquote,
      dl,
      dd,
      h1,
      h2,
      h3,
      h4,
      h5,
      h6,
      hr,
      figure,
      p,
      pre {
        margin: 0;
      }
      
      fieldset {
        margin: 0;
        padding: 0;
      }
      
      legend {
        padding: 0;
      }
      
      ol,
      ul,
      menu {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      
      /*
      Prevent resizing textareas horizontally by default.
      */
      
      textarea {
        resize: vertical;
      }
      
      /*
      1. Reset the default placeholder opacity in Firefox. (https://github.com/tailwindlabs/tailwindcss/issues/3300)
      2. Set the default placeholder color to the user's configured gray 400 color.
      */
      
      input::placeholder,
      textarea::placeholder {
        opacity: 1;
        /* 1 */
        color: #9ca3af;
        /* 2 */
      }
      
      /*
      Set the default cursor for buttons.
      */
      
      button,
      [role="button"] {
        cursor: pointer;
      }
      
      /*
      Make sure disabled buttons don't get the pointer cursor.
      */
      
      :disabled {
        cursor: default;
      }
      
      img,
      svg,
      video,
      canvas,
      audio,
      iframe,
      embed,
      object {
        display: block;
        /* 1 */
        vertical-align: middle;
        /* 2 */
      }
      
      /*
      Constrain images and videos to the parent width and preserve their intrinsic aspect ratio. (https://github.com/mozdevs/cssremedy/issues/14)
      */
      
      img,
      video {
        max-width: 100%;
        height: auto;
      }
      
      /* Make elements with the HTML hidden attribute stay hidden by default */
      
      [hidden] {
        display: none;
      }
      
      *, ::before, ::after {
        --tw-border-spacing-x: 0;
        --tw-border-spacing-y: 0;
        --tw-translate-x: 0;
        --tw-translate-y: 0;
        --tw-rotate: 0;
        --tw-skew-x: 0;
        --tw-skew-y: 0;
        --tw-scale-x: 1;
        --tw-scale-y: 1;
        --tw-pan-x:  ;
        --tw-pan-y:  ;
        --tw-pinch-zoom:  ;
        --tw-scroll-snap-strictness: proximity;
        --tw-ordinal:  ;
        --tw-slashed-zero:  ;
        --tw-numeric-figure:  ;
        --tw-numeric-spacing:  ;
        --tw-numeric-fraction:  ;
        --tw-ring-inset:  ;
        --tw-ring-offset-width: 0px;
        --tw-ring-offset-color: #fff;
        --tw-ring-color: rgb(59 130 246 / 0.5);
        --tw-ring-offset-shadow: 0 0 #0000;
        --tw-ring-shadow: 0 0 #0000;
        --tw-shadow: 0 0 #0000;
        --tw-shadow-colored: 0 0 #0000;
        --tw-blur:  ;
        --tw-brightness:  ;
        --tw-contrast:  ;
        --tw-grayscale:  ;
        --tw-hue-rotate:  ;
        --tw-invert:  ;
        --tw-saturate:  ;
        --tw-sepia:  ;
        --tw-drop-shadow:  ;
        --tw-backdrop-blur:  ;
        --tw-backdrop-brightness:  ;
        --tw-backdrop-contrast:  ;
        --tw-backdrop-grayscale:  ;
        --tw-backdrop-hue-rotate:  ;
        --tw-backdrop-invert:  ;
        --tw-backdrop-opacity:  ;
        --tw-backdrop-saturate:  ;
        --tw-backdrop-sepia:  ;
      }
      
      ::-webkit-backdrop {
        --tw-border-spacing-x: 0;
        --tw-border-spacing-y: 0;
        --tw-translate-x: 0;
        --tw-translate-y: 0;
        --tw-rotate: 0;
        --tw-skew-x: 0;
        --tw-skew-y: 0;
        --tw-scale-x: 1;
        --tw-scale-y: 1;
        --tw-pan-x:  ;
        --tw-pan-y:  ;
        --tw-pinch-zoom:  ;
        --tw-scroll-snap-strictness: proximity;
        --tw-ordinal:  ;
        --tw-slashed-zero:  ;
        --tw-numeric-figure:  ;
        --tw-numeric-spacing:  ;
        --tw-numeric-fraction:  ;
        --tw-ring-inset:  ;
        --tw-ring-offset-width: 0px;
        --tw-ring-offset-color: #fff;
        --tw-ring-color: rgb(59 130 246 / 0.5);
        --tw-ring-offset-shadow: 0 0 #0000;
        --tw-ring-shadow: 0 0 #0000;
        --tw-shadow: 0 0 #0000;
        --tw-shadow-colored: 0 0 #0000;
        --tw-blur:  ;
        --tw-brightness:  ;
        --tw-contrast:  ;
        --tw-grayscale:  ;
        --tw-hue-rotate:  ;
        --tw-invert:  ;
        --tw-saturate:  ;
        --tw-sepia:  ;
        --tw-drop-shadow:  ;
        --tw-backdrop-blur:  ;
        --tw-backdrop-brightness:  ;
        --tw-backdrop-contrast:  ;
        --tw-backdrop-grayscale:  ;
        --tw-backdrop-hue-rotate:  ;
        --tw-backdrop-invert:  ;
        --tw-backdrop-opacity:  ;
        --tw-backdrop-saturate:  ;
        --tw-backdrop-sepia:  ;
      }
      
      ::backdrop {
        --tw-border-spacing-x: 0;
        --tw-border-spacing-y: 0;
        --tw-translate-x: 0;
        --tw-translate-y: 0;
        --tw-rotate: 0;
        --tw-skew-x: 0;
        --tw-skew-y: 0;
        --tw-scale-x: 1;
        --tw-scale-y: 1;
        --tw-pan-x:  ;
        --tw-pan-y:  ;
        --tw-pinch-zoom:  ;
        --tw-scroll-snap-strictness: proximity;
        --tw-ordinal:  ;
        --tw-slashed-zero:  ;
        --tw-numeric-figure:  ;
        --tw-numeric-spacing:  ;
        --tw-numeric-fraction:  ;
        --tw-ring-inset:  ;
        --tw-ring-offset-width: 0px;
        --tw-ring-offset-color: #fff;
        --tw-ring-color: rgb(59 130 246 / 0.5);
        --tw-ring-offset-shadow: 0 0 #0000;
        --tw-ring-shadow: 0 0 #0000;
        --tw-shadow: 0 0 #0000;
        --tw-shadow-colored: 0 0 #0000;
        --tw-blur:  ;
        --tw-brightness:  ;
        --tw-contrast:  ;
        --tw-grayscale:  ;
        --tw-hue-rotate:  ;
        --tw-invert:  ;
        --tw-saturate:  ;
        --tw-sepia:  ;
        --tw-drop-shadow:  ;
        --tw-backdrop-blur:  ;
        --tw-backdrop-brightness:  ;
        --tw-backdrop-contrast:  ;
        --tw-backdrop-grayscale:  ;
        --tw-backdrop-hue-rotate:  ;
        --tw-backdrop-invert:  ;
        --tw-backdrop-opacity:  ;
        --tw-backdrop-saturate:  ;
        --tw-backdrop-sepia:  ;
      }
      
      .relative {
        position: relative;
      }
      
      .mx-auto {
        margin-left: auto;
        margin-right: auto;
      }
      
      .flex {
        display: flex;
      }
      
      .h-12 {
        height: 3rem;
      }
      
      .min-h-screen {
        min-height: 100vh;
      }
      
      .max-w-md {
        max-width: 28rem;
      }
      
      .flex-col {
        flex-direction: column;
      }
      
      .justify-center {
        justify-content: center;
      }
      
      .space-y-6 > :not([hidden]) ~ :not([hidden]) {
        --tw-space-y-reverse: 0;
        margin-top: calc(1.5rem * calc(1 - var(--tw-space-y-reverse)));
        margin-bottom: calc(1.5rem * var(--tw-space-y-reverse));
      }
      
      .overflow-hidden {
        overflow: hidden;
      }
      
      .rounded {
        border-radius: 0.25rem;
      }
      
      .border {
        border-width: 1px;
      }
      
      .border-b {
        border-bottom-width: 1px;
      }
      
      .border-E95495 {
        --tw-border-opacity: 1;
        border-color: rgb(233 84 149 / var(--tw-border-opacity));
      }
      
      .bg-gray-50 {
        --tw-bg-opacity: 1;
        background-color: rgb(249 250 251 / var(--tw-bg-opacity));
      }
      
      .bg-white {
        --tw-bg-opacity: 1;
        background-color: rgb(255 255 255 / var(--tw-bg-opacity));
      }
      
      .py-6 {
        padding-top: 1.5rem;
        padding-bottom: 1.5rem;
      }
      
      .px-6 {
        padding-left: 1.5rem;
        padding-right: 1.5rem;
      }
      
      .py-8 {
        padding-top: 2rem;
        padding-bottom: 2rem;
      }
      
      .py-2 {
        padding-top: 0.5rem;
        padding-bottom: 0.5rem;
      }
      
      .px-4 {
        padding-left: 1rem;
        padding-right: 1rem;
      }
      
      .pt-10 {
        padding-top: 2.5rem;
      }
      
      .pb-8 {
        padding-bottom: 2rem;
      }
      
      .text-base {
        font-size: 1rem;
        line-height: 1.5rem;
      }
      
      .font-bold {
        font-weight: 700;
      }
      
      .leading-7 {
        line-height: 1.75rem;
      }
      
      .text-gray-600 {
        --tw-text-opacity: 1;
        color: rgb(75 85 99 / var(--tw-text-opacity));
      }
      
      .text-E95495 {
        --tw-text-opacity: 1;
        color: rgb(233 84 149 / var(--tw-text-opacity));
      }
      
      .shadow-xl {
        --tw-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        --tw-shadow-colored: 0 20px 25px -5px var(--tw-shadow-color), 0 8px 10px -6px var(--tw-shadow-color);
        box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
      }
      
      .ring-1 {
        --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
        --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
        box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
      }
      
      .ring-gray-9005 {
        --tw-ring-color: rgb(17 24 39 / 0.05);
      }
      
      .hover-bg-E95495:hover {
        --tw-bg-opacity: 1;
        background-color: rgb(233 84 149 / var(--tw-bg-opacity));
      }
      
      .hover-text-white:hover {
        --tw-text-opacity: 1;
        color: rgb(255 255 255 / var(--tw-text-opacity));
      }
      
      @media (min-width: 640px) {
        .sm:mx-auto {
          margin-left: auto;
          margin-right: auto;
        }
      
        .sm:max-w-lg {
          max-width: 32rem;
        }
      
        .sm:rounded-lg {
          border-radius: 0.5rem;
        }
      
        .sm:py-12 {
          padding-top: 3rem;
          padding-bottom: 3rem;
        }
      
        .sm:px-10 {
          padding-left: 2.5rem;
          padding-right: 2.5rem;
        }
      }    
    </style>
  </head>
  <body>
    <div class="relative flex min-h-screen flex-col justify-center overflow-hidden py-6 sm:py-12">
      <div class="relative bg-white px-6 pt-10 pb-8 sm:mx-auto sm:max-w-lg sm:rounded-lg sm:px-10">
        <div class="mx-auto max-w-md">
          <img src="https://docs.edg.io/logo.png" class="h-12" alt="Edgio Logo" />
          <div class="space-y-6 py-8 text-base leading-7 text-gray-600">
            <h1 class="font-bold">404: Page Not Found</h1>
            <p>Sorry, we couldn’t find what you were looking for.</p>
            <button onclick="history.back()" class="rounded border border-E95495 py-2 px-4 text-sm text-E95495 hover-bg-E95495 hover-text-white">&larr; Go Back</button>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`
