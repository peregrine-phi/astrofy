export interface Experience {
  title: string;
  subtitle: string;
  description: string;
}

export const cvData = {
  en: {
    profile: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    education: [
      {
        title: "Computer Science",
        subtitle: "2015 to 2019 at University Name, City, Country",
      }
    ],
    experience: [
      {
        title: "Software Engineer at Company Name",
        subtitle: "From Jan 2020 to Present at Company, City, Country",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit..."
      }
    ],
    skills: ["JavaScript", "TypeScript", "React", "Astro", "TailwindCSS"]
  },
  zh: {
    profile: "这里是中文简介...",
    education: [
      {
        title: "计算机科学",
        subtitle: "2015 - 2019，某某大学，城市，国家",
      }
    ],
    experience: [
      {
        title: "软件工程师，某某公司",
        subtitle: "2020年1月 - 至今，公司，城市，国家",
        description: "这里是中文工作描述..."
      }
    ],
    skills: ["JavaScript", "TypeScript", "React", "Astro", "TailwindCSS"]
  }
};
