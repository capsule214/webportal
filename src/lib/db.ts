import path from "path";
import { Sequelize, DataTypes, Model } from "sequelize";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: path.join(process.cwd(), "memo.db"),
  logging: false,
});

// メモボードの一覧情報
// visibility: private=非公開 / shared=指定ユーザーに公開 / public=全ユーザーに公開
// editScope: owner=所有者のみ編集可 / members=公開先のユーザーも編集可
export class Portal extends Model {
  declare id: number;
  declare name: string;
  declare deleted: boolean;
  declare userNo: string;
  declare visibility: string;
  declare sharedWith: string;
  declare editScope: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Portal.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
    deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    userNo: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "user_no",
    },
    visibility: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "private",
    },
    sharedWith: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
      field: "shared_with",
    },
    editScope: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "owner",
      field: "edit_scope",
    },
  },
  {
    sequelize,
    tableName: "portals",
    timestamps: true,
    underscored: true, // createdAt/updatedAt を created_at/updated_at 列に対応させる
  }
);

// メモボード内の要素の種類と表示座標位置管理
// type_id 1:URLリンク 2:画像 3:動画 4:リッチテキストノート
export const CONTENT_TYPE = {
  LINK_CARD: 1,
  IMAGE: 2,
  VIDEO: 3,
  RICH_TEXT: 4,
} as const;

export class Content extends Model {
  declare id: number;
  declare portalId: number;
  declare contentName: string;
  declare typeId: number;
  declare deleted: boolean;
  declare x: number;
  declare y: number;
  declare w: number;
  declare h: number;
  declare details?: ContentDetail[];
}

Content.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    portalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "portal_id",
    },
    contentName: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
      field: "content_name",
    },
    typeId: { type: DataTypes.INTEGER, allowNull: false, field: "type_id" },
    deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    x: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    y: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    w: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 200 },
    h: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 140 },
  },
  { sequelize, tableName: "contents", timestamps: false }
);

// メモボードの1コンテンツに含まれる詳細情報（URLアドレスや画像ファイル名など）
export class ContentDetail extends Model {
  declare id: number;
  declare contentsId: number;
  declare contents: string;
}

ContentDetail.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    contentsId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "contents_id",
    },
    contents: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
  },
  { sequelize, tableName: "contentdetails", timestamps: false }
);

Portal.hasMany(Content, { foreignKey: "portalId", as: "contents" });
Content.belongsTo(Portal, { foreignKey: "portalId" });
Content.hasMany(ContentDetail, { foreignKey: "contentsId", as: "details" });
ContentDetail.belongsTo(Content, { foreignKey: "contentsId" });

declare global {
  var _seqSynced: Promise<unknown> | undefined;
}

// sync()は既存テーブルに列を追加しないため、後から増えた列は個別に補う
async function syncSchema() {
  await sequelize.sync();
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable("portals");
  if (!("visibility" in table)) {
    await qi.addColumn("portals", "visibility", {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "private",
    });
  }
  if (!("shared_with" in table)) {
    await qi.addColumn("portals", "shared_with", {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
    });
  }
  if (!("edit_scope" in table)) {
    await qi.addColumn("portals", "edit_scope", {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "owner",
    });
  }
}

export async function ensureSync() {
  if (!global._seqSynced) {
    global._seqSynced = syncSchema();
  }
  await global._seqSynced;
}

export { sequelize };
