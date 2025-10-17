export interface IMerkleTreeNode {
  hash: Buffer;
  citizenId: number;
  citiSel: number;
  countOfDisagree: number;
  countOfAgree: number;
}
