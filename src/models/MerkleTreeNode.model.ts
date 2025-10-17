export interface IMerkleTreeNode {
  hash: Buffer;
  numbMandatoryComps: number;
  numbOptionalComps: number;
  citizenId: number;
  citiSel: number;
  countOfDisagree: number;
  countOfAgree: number;
}
