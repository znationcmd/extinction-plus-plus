/* CMD Sphere media channels — media-first posting, same permissions and durable
 * message storage as ordinary CMD Sphere text channels.
 * No new asset storage or destructive database migrations.
 */
export const isMediaChannel=channel=>String(channel?.type||"")==="media";
export function assertNativeMediaPost(channel,attachments){
 if(!isMediaChannel(channel))return;
 const items=Array.isArray(attachments)?attachments:[];
 const media=items.some(item=>/^(?:image|video)\//i.test(String(item?.contentType||"")));
 if(!media)throw Object.assign(new Error("Ce salon médias accepte les publications contenant une photo ou une vidéo."),{status:415});
}
