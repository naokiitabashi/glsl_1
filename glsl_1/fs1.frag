precision mediump float;
uniform vec4 globalColor;
varying vec4 vColor;
void main() {
  gl_FragColor = globalColor * vColor;
}

