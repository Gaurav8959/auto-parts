import { BrandRepository, ProductRepository } from "../../data-source/repository";
import { StringError } from "../../errors/string.error";
import { TBrand } from "../../types/catalog.type";

const list = async () => {
  return BrandRepository.createQueryBuilder("brand")
    .leftJoin(
      "product",
      "product",
      "product.brand_id = brand.id AND product.is_deleted = 0"
    )
    .select([
      "brand.id AS id",
      "brand.name AS name",
      "brand.description AS description",
      "COUNT(product.id) AS productCount",
    ])
    .groupBy("brand.id")
    .orderBy("brand.name", "ASC")
    .getRawMany()
    .then((rows) =>
      rows.map((row) => ({ ...row, productCount: Number(row.productCount) }))
    );
};

const create = async (params: TBrand, userId: number) => {
  return BrandRepository.save({
    name: params.name.trim(),
    description: params.description,
    createdBy: { id: userId },
    updatedBy: { id: userId },
  });
};

const update = async (id: number, params: TBrand, userId: number) => {
  const brand = await BrandRepository.findOne({ where: { id } });
  if (!brand) throw new StringError("Brand not found.");

  await BrandRepository.update(id, {
    name: params.name.trim(),
    description: params.description,
    updatedBy: { id: userId },
  });
  return BrandRepository.findOne({ where: { id } });
};

const remove = async (id: number) => {
  const inUse = await ProductRepository.count({
    where: { brand: { id }, isDeleted: false },
  });
  if (inUse) {
    throw new StringError(
      `This brand is used by ${inUse} product(s). Move them first.`
    );
  }
  await BrandRepository.delete(id);
  return { id };
};

export default { list, create, update, remove };
