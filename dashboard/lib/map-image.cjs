const signature = Buffer.from([137,80,78,71,13,10,26,10]);
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
// Preserve the pixel data; discard only a broken ancillary colour profile.
function repairMapPng(input) {
  if (!Buffer.isBuffer(input) || input.length > 16 * 1024 * 1024 || !input.subarray(0,8).equals(signature)) throw new Error('PNG invalide.');
  const chunks = [signature]; let offset = 8, header = false, pixels = false, ended = false;
  while (offset < input.length) {
    if (input.length - offset < 12) throw new Error('PNG incomplet.');
    const length = input.readUInt32BE(offset), end = offset + length + 12;
    if (end > input.length) throw new Error('PNG incomplet.');
    const type = input.toString('ascii',offset+4,offset+8);
    const valid = crc32(input.subarray(offset+4,end-4)) === input.readUInt32BE(end-4);
    if (!header && (type !== 'IHDR' || length !== 13)) throw new Error('En-tête PNG invalide.');
    if (!valid && type !== 'iCCP') throw new Error('Données PNG corrompues.');
    if (type === 'IHDR') {
      if (header) throw new Error('En-tête PNG dupliqué.');
      const width=input.readUInt32BE(offset+8),height=input.readUInt32BE(offset+12);
      if (!width || !height || width>16384 || height>16384) throw new Error('Dimensions PNG invalides.');
      header=true;
    }
    if (type === 'IDAT') pixels=true;
    if (valid) chunks.push(input.subarray(offset,end));
    offset=end;
    if (type==='IEND') {if(length!==0 || offset!==input.length)throw new Error('Fin PNG invalide.');ended=true;break;}
  }
  if (!header || !pixels || !ended) throw new Error('PNG incomplet.');
  return Buffer.concat(chunks);
}
module.exports = {repairMapPng};
