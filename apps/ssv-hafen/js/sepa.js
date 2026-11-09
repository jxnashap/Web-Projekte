/* SSV Hafen-Manager – SEPA-Basislastschrift als XML (pain.008.001.08, DK-TVS 3.8)
 * Ab November 2026 nehmen deutsche Banken nur noch diese Version an.
 * Die Datei wird im Online-Banking (bzw. per EBICS) als Sammellastschrift hochgeladen. */
(function () {
  'use strict';

  // SEPA-Zeichensatz: Umlaute umschreiben, alles andere Unzulässige entfernen
  function sepaText(s, max) {
    const t = String(s || '').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[„“”]/g, '"').replace(/[–—]/g, '-').replace(/[^A-Za-z0-9/\-?:().,'+ ]/g, ' ').replace(/\s+/g, ' ').trim();
    return t.slice(0, max);
  }
  const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function ibanGueltig(iban) {
    const i = String(iban || '').replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(i)) return false;
    const umgestellt = i.slice(4) + i.slice(0, 4);
    let rest = 0;
    for (const c of umgestellt) {
      const z = c >= 'A' ? String(c.charCodeAt(0) - 55) : c;
      for (const ziffer of z) rest = (rest * 10 + Number(ziffer)) % 97;
    }
    return rest === 1;
  }
  const glaeubigerGueltig = (id) => /^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z0-9]{1,28}$/.test(String(id || '').replace(/\s/g, '').toUpperCase());

  /**
   * @param verein  { name, iban, bic, glaeubiger_id }
   * @param posten  [{ betrag, mandat_ref, mandat_datum, name, iban, bic, zweck, e2e }]
   * @param faellig  'YYYY-MM-DD' (Einzugstermin, mind. 1 Bankarbeitstag nach Einreichung)
   */
  function erzeugen(verein, posten, faellig, msgId) {
    const jetzt = new Date();
    const creDtTm = jetzt.toISOString().slice(0, 19);
    const summe = (posten.reduce((s, p) => s + Math.round(p.betrag * 100), 0) / 100).toFixed(2);
    const bicOderNotProvided = (bic) => bic ? '<FinInstnId><BICFI>' + xml(bic.replace(/\s/g, '').toUpperCase()) + '</BICFI></FinInstnId>' : '<FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId>';
    const tx = posten.map((p) => `
      <DrctDbtTxInf>
        <PmtId><EndToEndId>${xml(sepaText(p.e2e, 35))}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">${Number(p.betrag).toFixed(2)}</InstdAmt>
        <DrctDbtTx><MndtRltdInf><MndtId>${xml(sepaText(p.mandat_ref, 35))}</MndtId><DtOfSgntr>${p.mandat_datum}</DtOfSgntr></MndtRltdInf></DrctDbtTx>
        <DbtrAgt>${bicOderNotProvided(p.bic)}</DbtrAgt>
        <Dbtr><Nm>${xml(sepaText(p.name, 70))}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${xml(p.iban.replace(/\s/g, '').toUpperCase())}</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>${xml(sepaText(p.zweck, 140))}</Ustrd></RmtInf>
      </DrctDbtTxInf>`).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${xml(sepaText(msgId, 35))}</MsgId>
      <CreDtTm>${creDtTm}</CreDtTm>
      <NbOfTxs>${posten.length}</NbOfTxs>
      <CtrlSum>${summe}</CtrlSum>
      <InitgPty><Nm>${xml(sepaText(verein.name, 70))}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${xml(sepaText(msgId + '-1', 35))}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${posten.length}</NbOfTxs>
      <CtrlSum>${summe}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl><LclInstrm><Cd>CORE</Cd></LclInstrm><SeqTp>RCUR</SeqTp></PmtTpInf>
      <ReqdColltnDt>${faellig}</ReqdColltnDt>
      <Cdtr><Nm>${xml(sepaText(verein.name, 70))}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${xml(verein.iban.replace(/\s/g, '').toUpperCase())}</IBAN></Id></CdtrAcct>
      <CdtrAgt>${bicOderNotProvided(verein.bic)}</CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId><Id><PrvtId><Othr><Id>${xml(verein.glaeubiger_id.replace(/\s/g, '').toUpperCase())}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id></CdtrSchmeId>${tx}
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>
`;
  }

  window.HAFEN_SEPA = { erzeugen, ibanGueltig, glaeubigerGueltig, sepaText };
})();
