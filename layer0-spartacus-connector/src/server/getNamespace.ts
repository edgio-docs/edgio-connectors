import { createNamespace } from 'cls-hooked'

const ns = createNamespace('layer0-spartacus')

/**
 * Creates and then retrieves a namespace to use for storing requests made for
 * SSR, to be used later in a header value
 */
const getNamespace = () => ns

export default getNamespace
