import mongoose from 'mongoose';

const UserConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  configs: [{
    name: String,
    exportDate: String,
    tabs: [{
      id: String,
      title: String,
      selectedTool: String,
      parameters: mongoose.Schema.Types.Mixed,
      customCommand: String // Ajout du champ customCommand pour stocker la commande personnalisée
    }]
  }]
}, { timestamps: true });

export const UserConfig = mongoose.model('UserConfig', UserConfigSchema);
