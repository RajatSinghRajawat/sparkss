import { baseApi } from "./baseApi";
import type { ApiResponse ,
  HelpConversationResponse,
  SendHelpMessageRequest,
} from "../../types/auth.types";
import { API_CONFIG } from "../../config/api.config";

const { ENDPOINTS } = API_CONFIG;

export const helpApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHelpMessages: builder.query<
      ApiResponse<HelpConversationResponse>,
      void
    >({
      query: () => ENDPOINTS.AUTH.HELP,
      providesTags: ["Help"],
    }),
    sendHelpMessage: builder.mutation<
      ApiResponse<{ message: { _id: string; from: string; text: string; createdAt: string } }>,
      SendHelpMessageRequest
    >({
      query: (body) => ({
        url: ENDPOINTS.AUTH.HELP,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Help"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetHelpMessagesQuery,
  useLazyGetHelpMessagesQuery,
  useSendHelpMessageMutation,
} = helpApi;
