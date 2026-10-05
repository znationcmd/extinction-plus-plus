function duration(seconds,multiplier){if(!Number.isFinite(seconds)||seconds<0||!Number.isFinite(multiplier)||multiplier<=0||multiplier>10000)throw new Error('Durée et multiplicateur valides requis.');return seconds/multiplier;}
module.exports={duration};
