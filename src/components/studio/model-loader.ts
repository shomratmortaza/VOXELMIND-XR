import {KTX2Loader, type GLTFLoader} from "three-stdlib";
import type {WebGLRenderer} from "three";
let textureDecoder:KTX2Loader|undefined;
let renderer:WebGLRenderer|undefined;
/** Local transcoders are shared, not recreated per furniture instance. Existing GLBs stay compatible. */
export function configureModelLoader(gl:WebGLRenderer) {
  return (loader:GLTFLoader)=>{
    if(!textureDecoder || renderer!==gl){textureDecoder?.dispose();textureDecoder=new KTX2Loader().setTranscoderPath("/decoders/basis/").detectSupport(gl);renderer=gl;}
    loader.setKTX2Loader(textureDecoder);
  };
}