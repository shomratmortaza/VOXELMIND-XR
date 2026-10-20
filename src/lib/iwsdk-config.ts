/** IWSDK hands default on; own builds may explicitly select native hands. */
export function usesIWSDK(value: unknown = import.meta.env['VITE_XR_INPUT']): boolean {
  return value !== "native";
}

/** Anchors remain explicitly opted in, independently of default hands. */
export function usesIWSDKRoomAnchors(value: unknown = import.meta.env['VITE_XR_INPUT']): boolean {
  return value === "iwsdk";
}
