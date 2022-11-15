attribute vec3  position;
attribute vec4  color;
attribute float size;
uniform   vec2  mouse;
uniform   vec2  resolution;
varying   vec4  vColor;
uniform float nowTime;

void main() {
  vColor = color;
  float aspect = 1.0 / (resolution.x / resolution.y);
  vec3 p = position * vec3(aspect, 1.0, 1.0);
  gl_Position = vec4(position *  vec3(1.0,  sin(nowTime),1.0)+ vec3(mouse, 0.0), 1.0);
  gl_PointSize = size;
}

