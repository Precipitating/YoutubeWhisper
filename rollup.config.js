import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
export default {
  input: "src/app.js",   
  output: {
    file: "build/app.js", 
    format: "iife",
    inlineDynamicImports: true
  },
  plugins: [
    resolve({ browser: true }),
    commonjs()
  ]
};
