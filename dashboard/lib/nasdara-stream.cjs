'use strict';

const {MORSE_DIGITS, decodeTransmission} = require('./nasdara-data.cjs');

/**
 * Détecteur de bips (booléens), indépendant du microphone et de Discord.
 * L'entrée doit être un booléen "tonalité présente" et le temps monotone en ms.
 * Un chiffre Morse utilise exactement cinq signes. Dix chiffres forment une
 * transmission : six de grille, quatre de cadenas.
 */
function createMorseStream(options={}) {
  const dashMs=options.dashMs??850;
  const characterGapMs=options.characterGapMs??900;
  const minimumBeepMs=options.minimumBeepMs??160;
  const messageGapMs=options.messageGapMs??6000;
  let tone=false, toneStart=0, silenceStart=0, symbols='', digits='', lastTime=-1;
  const events=[];

  function finishDigit() {
    if(!symbols)return;
    const decoded=MORSE_DIGITS[symbols];
    symbols='';
    if(decoded===undefined){digits='';return;}
    digits+=decoded;
    if(digits.length===10){
      let message;
      try{message=decodeTransmission(digits);}catch{message=null;}
      if(message?.bunker&&message.code) events.push(message);
      digits='';
    }else if(digits.length>10)digits='';
  }

  function sample(active, atMs) {
    if(!Number.isFinite(atMs)||atMs<lastTime)throw new Error('Temps de capture audio non monotone.');
    lastTime=atMs;
    active=Boolean(active);
    if(active!==tone){
      if(active){
        // Silence avant une nouvelle impulsion.
        if(!tone && silenceStart>0 && atMs-silenceStart>=characterGapMs)finishDigit();
        if(!tone && silenceStart>0 && atMs-silenceStart>=messageGapMs)digits='';
        toneStart=atMs;
      }else{
        const duration=atMs-toneStart;
        if(duration>=minimumBeepMs&&duration<6000)symbols+=duration>=dashMs?'-':'.';
        else if(duration>=6000){symbols='';digits='';}
        silenceStart=atMs;
      }
      tone=active;
    }else if(!active && silenceStart>0){
      const pause=atMs-silenceStart;
      if(pause>=characterGapMs&&symbols)finishDigit();
      if(pause>=messageGapMs&&digits)digits='';
    }
    return events.splice(0);
  }
  function snapshot(){return {tone,symbols,digits};}
  function reset(){tone=false;toneStart=0;silenceStart=0;symbols='';digits='';lastTime=-1;events.length=0;}
  return {sample,snapshot,reset};
}

module.exports={createMorseStream};
