import path from "path";
import { Sequelize, DataTypes, Model } from "sequelize";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: path.join(process.cwd(), "memo.db"),
  logging: false,
});

export class Card extends Model {
  declare id: string;
  declare x: number;
  declare y: number;
  declare width: number;
  declare height: number;
  declare title: string;
  declare titleColor: string;
  declare zIndex: number;
  declare links?: Link[];
}

Card.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    x: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    y: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    width: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 200 },
    height: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 140 },
    title: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
    titleColor: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
      field: "title_color",
    },
    zIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "z_index",
    },
  },
  { sequelize, tableName: "cards", timestamps: false }
);

export class Link extends Model {
  declare id: string;
  declare cardId: string;
  declare title: string;
  declare url: string;
  declare sortOrder: number;
}

Link.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    cardId: { type: DataTypes.STRING, allowNull: false, field: "card_id" },
    title: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
    url: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sort_order",
    },
  },
  { sequelize, tableName: "links", timestamps: false }
);

Card.hasMany(Link, { foreignKey: "cardId", as: "links" });
Link.belongsTo(Card, { foreignKey: "cardId" });

export class Image extends Model {
  declare id: string;
  declare x: number;
  declare y: number;
  declare width: number;
  declare height: number;
  declare zIndex: number;
  declare url: string;
  declare mimeType: string;
  declare data: Buffer | null;
}

Image.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    x: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    y: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    width: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 80 },
    height: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 80 },
    zIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "z_index",
    },
    url: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
      field: "mime_type",
    },
    data: { type: DataTypes.BLOB, allowNull: true },
  },
  { sequelize, tableName: "images", timestamps: false }
);

export class RichText extends Model {
  declare id: string;
  declare x: number;
  declare y: number;
  declare width: number;
  declare height: number;
  declare zIndex: number;
  declare content: string;
}

RichText.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    x: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    y: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    width: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 260 },
    height: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 180 },
    zIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "z_index",
    },
    content: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
  },
  { sequelize, tableName: "rich_texts", timestamps: false }
);

export class Video extends Model {
  declare id: string;
  declare x: number;
  declare y: number;
  declare width: number;
  declare height: number;
  declare zIndex: number;
  declare url: string;
}

Video.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    x: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    y: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    width: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 320 },
    height: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 180 },
    zIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "z_index",
    },
    url: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
  },
  { sequelize, tableName: "videos", timestamps: false }
);

declare global {
  var _seqSynced: Promise<unknown> | undefined;
}

export async function ensureSync() {
  if (!global._seqSynced) {
    global._seqSynced = sequelize.sync();
  }
  await global._seqSynced;
}

export { sequelize };
