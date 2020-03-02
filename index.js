import Vue from 'vue'
import * as nacl from 'ecma-nacl'



const VueNaclCrypter = {
  encodeUTF8 (str) {
    var utf8 = unescape(encodeURIComponent(str))

    var arr = []
    for (var i = 0; i < utf8.length; i++) {
      arr.push(utf8.charCodeAt(i))
    }
    return new Uint8Array(arr)
  },

  NextNon () {
    var nonce = new Uint8Array(24)
    crypto.getRandomValues(nonce)
    return nonce
  },

  arr2str (arr) {
    var utf8 = Array.from(arr).map(function (item) {
      return String.fromCharCode(item)
    }).join('')

    return decodeURIComponent(escape(utf8))
  },

  isObject (value) {
    return value && typeof value === 'object' && value.constructor === Object
  },

  encrypt (text, nonce = null, key) {
    var ctext = this.encodeUTF8(text)
    var ckey = this.encodeUTF8(key)
    return nacl.secret_box.formatWN.pack(ctext, nonce || this.NextNon(), ckey)
  },

  decrypt (text, key) {
    var res = this.isObject(text) ? Object.values(text) : text.split(',')
    var dtext = new Uint8Array(res)
    var dkey = this.encodeUTF8(key)
    var decode = nacl.secret_box.formatWN.open(dtext, dkey)
    var uncode = this.arr2str(decode)
    return uncode
  }
}

const Dcrypt = {}

Dcrypt.encrypt = VueNaclCrypter.encrypt
Dcrypt.decrypt = VueNaclCrypter.decrypt

export default () => {
  Vue.prototype.$Dcrypt = Dcrypt
}

export { VueNaclCrypter }
export { Dcrypt }
