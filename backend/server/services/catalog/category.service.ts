import { CategoryRepository, ProductRepository } from "../../data-source/repository";
import { StringError } from "../../errors/string.error";
import { TCategory } from "../../types/catalog.type";

const list = async () => {
  return CategoryRepository.createQueryBuilder("category")
    .leftJoin(
      "product",
      "product",
      "product.category_id = category.id AND product.is_deleted = 0"
    )
    .select([
      "category.id AS id",
      "category.name AS name",
      "category.description AS description",
      "COUNT(product.id) AS productCount",
    ])
    .groupBy("category.id")
    .orderBy("category.name", "ASC")
    .getRawMany()
    .then((rows) =>
      rows.map((row) => ({ ...row, productCount: Number(row.productCount) }))
    );
};

const create = async (params: TCategory, userId: number) => {
  return CategoryRepository.save({
    name: params.name.trim(),
    description: params.description,
    createdBy: { id: userId },
    updatedBy: { id: userId },
  });
};

const update = async (id: number, params: TCategory, userId: number) => {
  const category = await CategoryRepository.findOne({ where: { id } });
  if (!category) throw new StringError("Category not found.");

  await CategoryRepository.update(id, {
    name: params.name.trim(),
    description: params.description,
    updatedBy: { id: userId },
  });
  return CategoryRepository.findOne({ where: { id } });
};

const remove = async (id: number) => {
  const inUse = await ProductRepository.count({
    where: { category: { id }, isDeleted: false },
  });
  if (inUse) {
    throw new StringError(
      `This category is used by ${inUse} product(s). Move them first.`
    );
  }
  await CategoryRepository.delete(id);
  return { id };
};

export default { list, create, update, remove };
