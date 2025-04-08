export interface ICourses {
  name: string;
  duration?: string | null;
  specialization?: string[] | null;
}

export interface IGraduationDegree {
  courses: ICourses[];
  specialization?: string[] | null;
}

export type IDegrees = Record<string, IGraduationDegree>;

export interface IGraduation {
  'Science(PCM)': IGraduationDegree;
  'Science(PCB)': IGraduationDegree;
  Commerce: IGraduationDegree;
  'Arts/Humanities/Social Sciences': IGraduationDegree;
  General: IDegrees;
}

export interface IPostGraduation {
  Science: IGraduationDegree;
  Commerce: IGraduationDegree;
  Arts: IGraduationDegree;
  General: IGraduationDegree;
}

export interface IUserAcademicDetails {
  boards: string[];
  streams: string[];
  graduation: IGraduation;
  postGraduation: IPostGraduation;
  professions: string[];
}

export interface IUserInterest {
  name: string;
  imageUrl: string;
}
