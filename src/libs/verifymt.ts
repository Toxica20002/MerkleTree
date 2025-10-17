import keccak256 from 'keccak256';

import { buildProoves, buildRootObj } from '../services/merkletreeUtils';

import MerkleTree from './merkletreejs/merkletree';

const buf2hex = (x) => `0x${x.toString('hex')}`;

export const verify = async (
  MyContract,
  totalOpinions = 0,
  proof,
  leaf,
  isMandatory = 0,
  processedCitizenId = 0,
  citiSel = 0,
  countOfDisagree = 0,
  countOfAgree = 0,
) => {
  try {
    const hashedLeaf = buf2hex(keccak256(leaf));
    console.log(
      `proof:`,
      proof,
      `processCitizenId: ${processedCitizenId}`,
      `citiSel: ${citiSel}`,
      `totalOpinions: ${totalOpinions}`,
      `countOfDisagree: ${countOfDisagree}`,
      `countOfAgree: ${countOfAgree}`,
    );
    const verified = await MyContract.methods
      .verifyThesis(
        proof,
        hashedLeaf,
        processedCitizenId,
        citiSel * 10,
        totalOpinions,
        countOfDisagree,
        countOfAgree,
      )
      .call()
      .catch((err) => {
        console.log(err);
        return;
      });
    return verified;
  } catch (e) {
    console.log(e);
    return undefined;
  }
};

export const createMT = (data) => {
  // Quan - Task 1: Do some console logs
  const leaves = data
    .map((x) => ({
      hash: keccak256(x.hash),
      // numbMandatoryComps: x.isMandatory ? 1 : 0,
      // numbOptionalComps: !x.isMandatory ? 1 : 0,
      citizenId: x.citizenId,
      citiSel: x.citiSel * 10,
      countOfDisagree: x.countOfDisagree,
      countOfAgree: x.countOfAgree,
    }))
    .sort((a, b) => Buffer.compare(a.hash, b.hash));
  console.log(data, leaves);
  const tree = new MerkleTree(leaves, keccak256, { sort: true });
  const root = tree.getRoot();
  const proofs: any[] = buildProoves(leaves, tree, data, buf2hex, keccak256);
  console.log(root);
  // Root of AMT
  const newRoot = buildRootObj(root, buf2hex);

  const totalOpinions = root.countOfDisagree + root.countOfAgree;
  return {
    proofs,
    MTRoot: newRoot,
    // NumbMandatory: root.numbMandatoryComps,
    // NumbOptional: root.numbOptionalComps,
    citizenId: root.citizenId,
    citiSel: root.citiSel,
    totalOpinions: totalOpinions || 0,
    countOfDisagree: root.countOfDisagree,
    countOfAgree: root.countOfAgree,
  };
};
