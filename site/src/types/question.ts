export interface Question {
  id: string
  no: number
  category: string
  subcategory: string
  difficulty: 1 | 2 | 3
  text: string
  choices: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  explanation: string
  source?: string
}

export interface QuestionBank {
  version: string
  questions: Question[]
}
