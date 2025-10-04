import mongoose, { Schema, Document } from "mongoose";

export interface ISnippet extends Document {
  title: string;
  code: string;
  project: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  comments: Array<{
    text: string;
    user: mongoose.Types.ObjectId;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const snippetSchema = new Schema<ISnippet>(
  {
    title: { type: String, required: true },
    code: { type: String, required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    comments: [{
      text: { type: String, required: true },
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      createdAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

export default mongoose.model<ISnippet>("Snippet", snippetSchema);