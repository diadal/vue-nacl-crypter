[![Build Status][travis-image]][travis-url]
[![Known Vulnerabilities](https://snyk.io/test/github/diadal/vue-nacl-crypter/badge.svg)](https://snyk.io/test/github/diadal/vue-nacl-crypter)


# vue-nacl-crypter: Vue JavaScript (ECMAScript) version of Ecma-Nacl & NaCl cryptographic library.

vue-nacl-crypter  is a re-write of ecma-nacl & NaCl in TypeScript, which is ECMAScript with compile-time types.
Library implements NaCl's box and secret box.
Signing code comes from SUPERCOP version 2014-11-24.


Scrypt is a highly valuable thing for services that allow users to have passwords, while doing proper work with crypto keys, derived from those passwords.


## Get vue-nacl-crypter

### NPM Package

This library is registered on
[npmjs.org](https://npmjs.org/package/vue-nacl-crypter). To install it, do:

    npm install vue-nacl-crypter



## vue-nacl-crypter Usage

### API for secret-key authenticated encryption

Add module into code as

```javascript
import Vue from 'vue'
import * as cr from 'vue-nacl-crypter' 

const Dcrypt = cr.VueNaclCrypter

Vue.use(Dcrypt)


```
`Vue.use(Dcrypt)` make `$Dcrypt` available in your Vue component codes you can call a

[Secret-key authenticated](http://nacl.cr.yp.to/secretbox.html) encryption is provided by secret_box, which implements XSalsa20+Poly1305.

When encrypting, or packing, NaCl does following things. First, it encrypts plain text bytes using XSalas20 algorithm. Secondly, it creates 16 bytes of authentication Poly1305 code, and places these infront of the cipher. Thus, regular byte layout is 16 bytes of Poly1305 code, followed by cipher with actual message, having exactly the same length as plain text message.

Decrypting, or opening goes through these steps in reverse. First, Poly1305 code is read and is compared with code, generated by reading cipher. When these do not match, it means either that key+nonce pair is incorrect, or that cipher with message has been damaged/changed. Our code will throw an exception in such a case. When verification is successful, XSalsa20 will do decryption, producing message bytes.


Key is 32 bytes long. Nonce is 24 bytes. Nonce means number-used-once, i.e. it should be unique for every segment encrypted by the same key.

Sometimes, when storing things, it is convenient to pack cipher together with nonce (WN) into the same array.

    +-------+ +------+ +---------------+
    | nonce | | poly | |  data cipher  |
    +-------+ +------+ +---------------+
    | <----       WN format      ----> |

For this, secret_box has formatWN object, which is used analogously:

```javascript

var encrypt = this.$Dcrypt.encrypt(text, nonce=null, key);
// if you dont know how to handle nonce VueNaclCrypter will handle that for you automatic

// decryption, or opening is done by
var decrypt = this.$Dcrypt.decrypt(crypt_data, key);

```


<!-- ```javascript
// nonce changed in place oddly
nacl.nonce.advanceOddly(nonce);

// nonce changed in place evenly
nacl.nonce.advanceEvenly(nonce);

// nonce changed in place by delta
nacl.nonce.advance(nonce, delta);

// calculate related nonce
var relatedNonce = nacl.nonce.calculateNonce(nonce, delta, arrayFactory);

// find delta between nonces (null result is for unrelated nonces)
var delta = nacl.nonce.calculateDelta(n1, n2);
```

It is common, that certain code needs to be given encryption/decryption functionality, but according to [principle of least authority](https://en.wikipedia.org/wiki/Principle_of_least_privilege) such code does not necessarily need to know secret key, with which encryption is done. So, one may make an encryptor and a decryptor. These are made to produce and read ciphers with-nonce format.

```javascript
// delta is optional, defaults to one
var encryptor = nacl.secret_box.formatWN.makeEncryptor(key, nextNonce, delta);

// packing bytes is done with
var cipher_bytes = encryptor.pack(plain_bytes);

// when encryptor is no longer needed, key should be properly wiped from memory
encryptor.destroy();

var decryptor = nacl.secret_box.formatWN.makeDecryptor(key);

// opening is done with
var result_bytes = decryptor.open(cipher_bytes);

// when encryptor is no longer needed, key should be properly wiped from memory
decryptor.destroy();
```

### API for public-key authenticated encryption

[Public-key authenticated](http://nacl.cr.yp.to/box.html) encryption is provided by box, which implements Curve25519+XSalsa20+Poly1305. Given pairs of secret-public keys, corresponding shared, in Diffie–Hellman sense, key is calculated (Curve25519) and is used for data encryption with secret_box (XSalsa20+Poly1305).

Given any random secret key, we can generate corresponding public key:

```javascript
var public_key = nacl.box.generate_pubkey(secret_key);
```

Secret key may come from browser's crypto.getRandomValues(array), or be derived from a passphrase with scrypt.

There are two ways to use box. The first way is to always do two things, calculation of DH-shared key and subsequent packing/opening, in one step.

```javascript
// Alice encrypts message for Bob
var cipher_bytes = nacl.box.pack(msg_bytes, nonce, bob_pkey, alice_skey);

// Bob opens the message
var msg_bytes = nacl.box.open(cipher_bytes, nonce, alice_pkey, bob_skey);
```

The second way is to calculate DH-shared key once and use it for packing/opening multiple messages, with box.stream.pack and box.stream.open, which are just nicknames of described above secret_box.pack and secret_box.open.

```javascript
// Alice calculates DH-shared key
var dhshared_key = nacl.box.calc_dhshared_key(bob_pkey, alice_skey);
// Alice encrypts message for Bob
var cipher_bytes = nacl.box.stream.pack(msg_bytes, nonce, dhshared_key);

// Bob calculates DH-shared key
var dhshared_key = nacl.box.calc_dhshared_key(alice_pkey, bob_skey);
// Bob opens the message
var msg_bytes = nacl.box.stream.open(cipher_bytes, nonce, dhshared_key);
```

Or, we may use box encryptors that do first step of DH-shared key calculation only at creation.

Alice's side: -->
<!-- 
```javascript
// generate nonce, browser example
var nonce = new Uint8Array(24);
crypto.getRandomValues(nonce);

// make encryptor to produce with-nonce format (default delta is two)
var encryptor = nacl.box.formatWN.makeEncryptor(bob_pkey, alice_skey, nonce);

// pack messages to Bob
var cipher_to_send = encryptor.pack(msg_bytes);

// open mesages from Bob
var decryptor = nacl.box.formatWN.makeDecryptor(bob_pkey, alice_skey);
var msg_from_bob = decryptor.open(received_cipher);
    
// when encryptor is no longer needed, key should be properly wiped from memory
encryptor.destroy();
decryptor.destroy();
```

Bob's side:

```javascript
// get nonce from Alice's first message, advance it oddly, and
// use for encryptor, as encryptors on both sides advance nonces evenly
var nonce = nacl.box.formatWN.copyNonceFrom(cipher1_from_alice);
nacl.nonce.advanceOddly(nonce);

// make encryptor to produce with-nonce format (default delta is two)
var encryptor = nacl.box.formatWN.makeEncryptor(alice_pkey, bob_skey, nonce);

// pack messages to Alice
var cipher_to_send = encryptor.pack(msg_bytes);

// open mesages from Alice
var decryptor = nacl.box.formatWN.makeDecryptor(alice_pkey, bob_skey);
var msg_from_alice = encryptor.open(received_cipher);
    
// when encryptor is no longer needed, key should be properly wiped from memory
encryptor.destroy();
decryptor.destroy();
```

### Signing

Code for signing is a re-write of Ed25519 C version from [SUPERCOP's](http://bench.cr.yp.to/supercop.html), referenced in [NaCl](http://nacl.cr.yp.to/sign.html).

signing object contains all related functionality.

```javascript
// signing key pair can be generated from some seed array, which can
// either be random itself, or be generated from a password
var pair = nacl.signing.generate_keypair(seed);

// make signature bytes, for msg
var msgSig = nacl.signing.signature(msg, pair.skey);

// verify signature
var sigIsOK = nacl.signing.verify(msgSig, msg, pair.pkey);
```

There are functions like [NaCl's](http://nacl.cr.yp.to/sign.html) sign and sign_open methods, which place signature and message into one array, and expect the same for opening (verification).
In a context of [JWK](http://self-issued.info/docs/draft-ietf-jose-json-web-key.html), abovementioned functions seem to be more flexible and useful than C's API.

### Random number generation

NaCl does not do it. The randombytes in the original code is a unix shim with the following rational, given in the comment, quote: "it's really stupid that there isn't a syscall for this".

So, you should obtain cryptographically strong random bytes yourself. In node, there is crypto. There is crypto in browser. IE6? IE6 must die! Stop supporting insecure crap! Respect your users, and tell them truth, that they need modern secure browser(s).

### Scrypt - key derivation from passphrases

Scrypt derives a key from users password.
Algorithm is memory-hard, which means it uses lots and lots of memory.
There are three parameters that go into derivation: ``` N ``` ,
``` r ``` and
``` p ``` .

Amount of memory used is roughly ``` 128 * N * r == r * 2^(7+logN) ```  bytes.
With ``` r = 8 ``` ,
when ``` logN ```  is 10, it is a MB range of memory,
when ``` logN ```  is 20, it is a GB range of memory in use.

Parameter ``` p ```  says how many times should the whole operation occur.
So, when running out of memory (js is not giving enough memory for ``` logN = 20```
), one may up ``` p ```  value.

It goes without saying, that such operations take time, and this implementation has a callback for progress reporting.

```javascript
   // given pass (secret), salt and other less-secret parameters
   // key of length keyLen is generated as follows:
   var logN = 17;
   var r = 8;
   var p = 2;
   var key = nacl.scrypt(pass, salt, logN, r, p, keyLen, function(pDone) {
       console.log('derivation progress: ' + pDone + '%');
   }); 
```
 -->

if any issue [check](https://github.com/diadal/vue-nacl-crypter/issues)

[travis-image]: https://travis-ci.org/diadal/vue-nacl-crypter.svg?branch=master
[travis-url]: https://travis-ci.org/diadal/vue-nacl-crypter


## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
