import { sendUnSignedRequest } from "..";
import { Ex3JSON } from "../../utils/json";
import { Ex3Response, RootAssetInfo } from "../models";

export const GetAllAssetsAsync = async (): Promise<Ex3Response<RootAssetInfo[] | null>> => {
  const result = await sendUnSignedRequest(
    null,
    '/api/app/asset/get-all'
  );
  return Ex3JSON.parseEx3Ex3ResponseArray(result, RootAssetInfo);
}
