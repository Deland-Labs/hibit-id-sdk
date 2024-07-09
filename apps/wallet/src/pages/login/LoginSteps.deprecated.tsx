// import { observer } from "mobx-react";
// import { FC, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import hibitIdSession from "../../stores/session";
// import { useCreatePasskeyMutation, useEx3AuthorizeMutation, useSelectPasskeyMutation } from "../../apis/react-query/auth";

// const LoginSteps: FC<{ isCreate: boolean }> = observer(({ isCreate }) => {
//   const [credentialId, setCredentialId] = useState('')
//   const navigate = useNavigate()

//   const createPasskeyMutation = useCreatePasskeyMutation()
//   const selectPasskeyMutation = useSelectPasskeyMutation()
//   const authorizeMutation = useEx3AuthorizeMutation()

//   const step1Loading = isCreate ? createPasskeyMutation.isPending : selectPasskeyMutation.isPending
//   const step2Loading = authorizeMutation.isPending

//   return (
//     <div className="py-4">
//       <div className="flex items-center gap-4">
//         {step1Loading ? (
//           <span className="loading loading-spinner loading-sm text-primary"></span>
//         ) : (
//           <span className="size-6 rounded-full border border-base-content text-sm text-center leading-6">1</span>
//         )}
//         <div className="flex-1 py-4 border-b border-accent">
//           <p className="font-bold">{isCreate ? 'Create passkey' : 'Select passkey'}</p>
//           {!credentialId && (
//             <div className="mt-2 flex justify-between items-center">
//               <button className="btn btn-old-primary btn-sm" onClick={async () => {
//                 if (isCreate) {
//                   const credential = await createPasskeyMutation.mutateAsync()
//                   setCredentialId(credential.id)
//                 } else {
//                   const credentialId = await selectPasskeyMutation.mutateAsync()
//                   setCredentialId(credentialId)
//                 }
//               }}>
//                 Confirm
//               </button>
//               <a href="" className="link link-primary">what is passkey&gt;</a>
//             </div>
//           )}
//         </div>
//       </div>

//       <div className="flex items-center gap-4">
//         {step2Loading ? (
//           <span className="loading loading-spinner loading-sm text-primary"></span>
//         ) : (
//           <span className="size-6 rounded-full border border-base-content text-sm text-center leading-6">2</span>
//         )}
//         <div className="flex-1 py-4 border-b border-accent">
//           <p className="font-bold">Confirm authorization</p>
//           {credentialId && (
//             <div className="mt-2 flex justify-between items-center">
//               <button className="btn btn-old-primary btn-sm" onClick={async () => {
//                 await authorizeMutation.mutateAsync({
//                   session: hibitIdSession,
//                   credentialId
//                 })
//                 navigate('/')
//               }}>
//                 Confirm
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// })

// export default LoginSteps;
