export interface ISection {
  id: number;
  name: string;
  proof: any[];
  mandatory?: any;
  hash: any;
  citizenId: number;
  citiSel: number;
  countOfDisagree: number;
  countOfAgree: number;
}
