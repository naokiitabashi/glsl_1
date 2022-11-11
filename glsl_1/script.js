
/** ===========================================================================
 * このサンプルは、GLSL のその他のルールや仕様を解説するためのサンプルです。
 * 頂点シェーダのファイル（vs1.vert）に解説コメントが大量に記述されていますので
 * 確認しておきましょう。
 * ========================================================================= */

window.addEventListener('DOMContentLoaded', () => {
  const webgl = new WebGLFrame();
  webgl.init('webgl-canvas');

  webgl.load()
    .then(() => {
      webgl.setup();
      webgl.render();
    });
}, false);

class WebGLFrame {
  constructor() {
    this.canvas = null;  // canvas エレメント
    this.gl = null;  // WebGL コンテキスト
    this.running = false; // 実行中かどうかを表すフラグ
    this.beginTime = 0;     // 実行開始時のタイムスタンプ
    this.nowTime = 0;     // 実行開始からの経過時間（秒）
    // self binding
    this.render = this.render.bind(this);
  }
  /**
   * WebGL を実行するための初期化処理を行う。
   * @param {HTMLCanvasElement|string} canvas - canvas への参照か canvas の id 属性名のいずれか
   */
  init(canvas) {
    if (canvas instanceof HTMLCanvasElement === true) {
      this.canvas = canvas;
    } else if (Object.prototype.toString.call(canvas) === '[object String]') {
      const c = document.querySelector(`#${canvas}`);
      if (c instanceof HTMLCanvasElement === true) {
        this.canvas = c;
      }
    }
    if (this.canvas == null) { throw new Error('invalid argument'); }
    this.gl = this.canvas.getContext('webgl');
    if (this.gl == null) { throw new Error('webgl not supported'); }
  }
  /**
   * シェーダやテクスチャ用の画像など非同期で読み込みする処理を行う。
   * @return {Promise}
   */
  load() {
    // ロード完了後に必要となるプロパティを初期化
    this.program = null; // プログラムオブジェクト
    this.attLocation = null; // attribute location
    this.attStride = null; // attribute のストライド（float 何個分に相当するか）
    this.uniLocation = null; // uniform location
    this.uniType = null; // uniform のタイプ

    return new Promise((resolve) => {
      this.loadShader([
        './vs1.vert',
        './fs1.frag',
      ])
        .then((shaders) => {
          const gl = this.gl;
          const vs = this.createShader(shaders[0], gl.VERTEX_SHADER);
          const fs = this.createShader(shaders[1], gl.FRAGMENT_SHADER);
          this.program = this.createProgram(vs, fs);
          // attribute 変数関係
          this.attLocation = [
            gl.getAttribLocation(this.program, 'position'),
            gl.getAttribLocation(this.program, 'color'),
            gl.getAttribLocation(this.program, 'size'),
          ];
          this.attStride = [
            3,
            4,
            1,
          ];
          // uniform 変数関係
          this.uniLocation = [
            gl.getUniformLocation(this.program, 'globalColor'),
            gl.getUniformLocation(this.program, 'mouse'),
            gl.getUniformLocation(this.program, 'resolution'),
          ];
          this.uniType = [
            'uniform4fv',
            'uniform2fv',
            'uniform2fv',
          ];

          // ここまで問題なく完了したら Promise を解決する
          resolve();
        });
    });
  }
  /**
   * WebGL のレンダリングを開始する前のセットアップを行う。
   */
  setup() {
    const gl = this.gl;

    // マウスカーソルが動いたことを検出するためのイベントを記述
    this.mouseX = 0;
    this.mouseY = 0;
    window.addEventListener('mousemove', (evt) => {
      let x = evt.clientX;
      let y = evt.clientY;
      const width = window.innerWidth;
      const height = window.innerHeight;
      x = (x - width / 2.0) / (width / 2.0);
      y = (y - height / 2.0) / (height / 2.0);
      this.mouseX = x;
      this.mouseY = -y;
    });

    // 頂点の定義 @@@
    this.position = [];
    this.color = [];
    this.size = [];
    const VERTEX_COUNT = 10; // 一辺あたりの頂点の個数（正確にはブロック数）
    const VERTEX_SIZE = 8.0; // 頂点の既定のサイズ
    /**
     * XY 平面の -1.0 ～ 1.0 の範囲に、頂点を敷き詰めます。
     * これを実現するために、変数 i と変数 j を利用した多重ループ構造を作り、
     * X 座標と Y 座標のそれぞれが徐々に変化していくような状態を作り、同時に
     * 色も徐々に変化するように、計算してやります。
     */
    for (let i = 0; i <= VERTEX_COUNT; ++i) {
      // X 座標
      const x = (i / VERTEX_COUNT) * 2.0 - 1.0;
      for (let j = 0; j <= VERTEX_COUNT; ++j) {
        // Y 座標
        const y = (j / VERTEX_COUNT) * 2.0 - 1.0;
        this.position.push(x, y, 0.0);
        // カウンタの値から色を求める
        this.color.push(i / VERTEX_COUNT, j / VERTEX_COUNT, 0.5, 1.0);
        this.size.push(VERTEX_SIZE);
      }
    }

    // VBO の生成
    this.vbo = [
      this.createVbo(this.position),
      this.createVbo(this.color),
      this.createVbo(this.size),
    ];
    // 背景を何色でクリアするかを 0.0 ～ 1.0 の RGBA で指定する
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    // このサンプルでは常時描画し続ける恒常ループを行うので true を指定
    this.running = true;
    // セットアップ完了時刻のタイムスタンプを取得しておく
    this.beginTime = Date.now();
  }
  /**
   * WebGL を利用して描画を行う。
   */
  render() {
    const gl = this.gl;

    // running が true の場合は再帰する
    if (this.running === true) {
      requestAnimationFrame(this.render);
    }

    // 経過時間を取得
    this.nowTime = (Date.now() - this.beginTime) / 1000;
    // ウィンドウサイズぴったりに canvas のサイズを修正する
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    // WebGL 上のビューポートも canvas の大きさに揃える
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // あらかじめ指定されていたクリアカラーで canvas をクリアする
    gl.clear(gl.COLOR_BUFFER_BIT);

    // どのプログラムオブジェクトを使うのかを明示する
    gl.useProgram(this.program);
    // VBO と attribute location を使って頂点を有効にする
    this.setAttribute(this.vbo, this.attLocation, this.attStride);
    // uniform location を使って uniform 変数にデータを転送する
    this.setUniform([
      [1.0, 1.0, 1.0, 1.0],
      [this.mouseX, this.mouseY],
      [window.innerWidth, window.innerHeight],
    ], this.uniLocation, this.uniType);

    // 転送済みの情報を使って、頂点を画面にレンダリングする
    gl.drawArrays(gl.POINTS, 0, this.position.length / 3);
  }

  // utility method =========================================================

  /**
   * シェーダのソースコードを外部ファイルから取得する。
   * @param {Array.<string>} pathArray - シェーダを記述したファイルのパス（の配列）
   * @return {Promise}
   */
  loadShader(pathArray) {
    if (Array.isArray(pathArray) !== true) {
      throw new Error('invalid argument');
    }
    const promises = pathArray.map((path) => {
      return fetch(path).then((response) => { return response.text(); })
    });
    return Promise.all(promises);
  }

  /**
   * シェーダオブジェクトを生成して返す。
   * コンパイルに失敗した場合は理由をアラートし null を返す。
   * @param {string} source - シェーダのソースコード文字列
   * @param {number} type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
   * @return {WebGLShader} シェーダオブジェクト
   */
  createShader(source, type) {
    if (this.gl == null) {
      throw new Error('webgl not initialized');
    }
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return shader;
    } else {
      alert(gl.getShaderInfoLog(shader));
      return null;
    }
  }

  /**
   * プログラムオブジェクトを生成して返す。
   * シェーダのリンクに失敗した場合は理由をアラートし null を返す。
   * @param {WebGLShader} vs - 頂点シェーダオブジェクト
   * @param {WebGLShader} fs - フラグメントシェーダオブジェクト
   * @return {WebGLProgram} プログラムオブジェクト
   */
  createProgram(vs, fs) {
    if (this.gl == null) {
      throw new Error('webgl not initialized');
    }
    const gl = this.gl;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.useProgram(program);
      return program;
    } else {
      alert(gl.getProgramInfoLog(program));
      return null;
    }
  }

  /**
   * VBO を生成して返す。
   * @param {Array} data - 頂点属性データを格納した配列
   * @return {WebGLBuffer} VBO
   */
  createVbo(data) {
    if (this.gl == null) {
      throw new Error('webgl not initialized');
    }
    const gl = this.gl;
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vbo;
  }

  /**
   * IBO を生成して返す。
   * @param {Array} data - インデックスデータを格納した配列
   * @return {WebGLBuffer} IBO
   */
  createIbo(data) {
    if (this.gl == null) {
      throw new Error('webgl not initialized');
    }
    const gl = this.gl;
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return ibo;
  }

  /**
   * IBO を生成して返す。(INT 拡張版)
   * @param {Array} data - インデックスデータを格納した配列
   * @return {WebGLBuffer} IBO
   */
  createIboInt(data) {
    if (this.gl == null) {
      throw new Error('webgl not initialized');
    }
    const gl = this.gl;
    if (ext == null || ext.elementIndexUint == null) {
      throw new Error('element index Uint not supported');
    }
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return ibo;
  }

  /**
   * 画像ファイルを読み込み、テクスチャを生成してコールバックで返却する。
   * @param {string} source - ソースとなる画像のパス
   * @return {Promise}
   */
  createTextureFromFile(source) {
    if (this.gl == null) {
      throw new Error('webgl not initialized');
    }
    return new Promise((resolve) => {
      const gl = this.gl;
      const img = new Image();
      img.addEventListener('load', () => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        resolve(tex);
      }, false);
      img.src = source;
    });
  }

  /**
   * フレームバッファを生成して返す。
   * @param {number} width - フレームバッファの幅
   * @param {number} height - フレームバッファの高さ
   * @return {object} 生成した各種オブジェクトはラップして返却する
   * @property {WebGLFramebuffer} framebuffer - フレームバッファ
   * @property {WebGLRenderbuffer} renderbuffer - 深度バッファとして設定したレンダーバッファ
   * @property {WebGLTexture} texture - カラーバッファとして設定したテクスチャ
   */
  createFramebuffer(width, height) {
    if (this.gl == null) {
      throw new Error('webgl not initialized');
    }
    const gl = this.gl;
    const frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    const depthRenderBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);
    const fTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { framebuffer: frameBuffer, renderbuffer: depthRenderBuffer, texture: fTexture };
  }

  /**
   * フレームバッファを生成して返す。（フロートテクスチャ版）
   * @param {object} ext - getWebGLExtensions の戻り値
   * @param {number} width - フレームバッファの幅
   * @param {number} height - フレームバッファの高さ
   * @return {object} 生成した各種オブジェクトはラップして返却する
   * @property {WebGLFramebuffer} framebuffer - フレームバッファ
   * @property {WebGLTexture} texture - カラーバッファとして設定したテクスチャ
   */
  createFramebufferFloat(ext, width, height) {
    if (this.gl == null) {
      throw new Error('webgl not initialized');
    }
    const gl = this.gl;
    if (ext == null || (ext.textureFloat == null && ext.textureHalfFloat == null)) {
      throw new Error('float texture not supported');
    }
    const flg = (ext.textureFloat != null) ? gl.FLOAT : ext.textureHalfFloat.HALF_FLOAT_OES;
    const frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    const fTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, flg, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { framebuffer: frameBuffer, texture: fTexture };
  }

  /**
   * VBO を IBO をバインドし有効化する。
   * @param {Array} vbo - VBO を格納した配列
   * @param {Array} attL - attribute location を格納した配列
   * @param {Array} attS - attribute stride を格納した配列
   * @param {WebGLBuffer} ibo - IBO
   */
  setAttribute(vbo, attL, attS, ibo) {
    if (this.gl == null) {
      throw new Error('webgl not initialized');
    }
    const gl = this.gl;
    vbo.forEach((v, index) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, v);
      gl.enableVertexAttribArray(attL[index]);
      gl.vertexAttribPointer(attL[index], attS[index], gl.FLOAT, false, 0, 0);
    });
    if (ibo != null) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    }
  }

  /**
   * uniform 変数をまとめてシェーダに送る。
   * @param {Array} value - 各変数の値
   * @param {Array} uniL - uniform location を格納した配列
   * @param {Array} uniT - uniform 変数のタイプを格納した配列
   */
  setUniform(value, uniL, uniT) {
    if (this.gl == null) {
      throw new Error('webgl not initialized');
    }
    const gl = this.gl;
    value.forEach((v, index) => {
      const type = uniT[index];
      if (type.includes('Matrix') === true) {
        gl[type](uniL[index], false, v);
      } else {
        gl[type](uniL[index], v);
      }
    });
  }

  /**
   * 主要な WebGL の拡張機能を取得する。
   * @return {object} 取得した拡張機能
   * @property {object} elementIndexUint - Uint32 フォーマットを利用できるようにする
   * @property {object} textureFloat - フロートテクスチャを利用できるようにする
   * @property {object} textureHalfFloat - ハーフフロートテクスチャを利用できるようにする
   */
  getWebGLExtensions() {
    if (this.gl == null) {
      throw new Error('webgl not initialized');
    }
    const gl = this.gl;
    return {
      elementIndexUint: gl.getExtension('OES_element_index_uint'),
      textureFloat: gl.getExtension('OES_texture_float'),
      textureHalfFloat: gl.getExtension('OES_texture_half_float')
    };
  }
}

