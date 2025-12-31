import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
export default {
  
  input:{
    content: "src/content.js", 
    background: "src/background.js",
  },
  output: {
    dir: "build", 
    format: "es",

  },
  plugins: [
    resolve({ browser: true }),
    commonjs()
  ]
};
