import { ColumnType as AllCoulmnTypes, getSchemaApiV1ModelVersionsModelVersionIdSchemaGet } from 'api/generated';
import { ColumnType } from 'helpers/types/model';

type Features = Record<string, AllCoulmnTypes>;

interface FeaturesResponse {
  features: Features;
  feature_importance: Record<string, number>;
}

export async function getAvailableFeaturesNames(modelVersionId: number) {
  const { features, feature_importance } = (await getSchemaApiV1ModelVersionsModelVersionIdSchemaGet(
    modelVersionId
  )) as FeaturesResponse;

  let featuresNames;
  if (feature_importance != null && Object.keys(feature_importance).length) {
    // Sort first by importance, then by name
    featuresNames = Object.keys(feature_importance).sort(
      (a, b) => feature_importance[b] - feature_importance[a] || a.localeCompare(b)
    );
  } else {
    featuresNames = Object.keys(features).sort();
  }
  return (featuresNames = featuresNames.filter(val => features?.[val] in ColumnType));
}

export async function getAvailableFeatures(modelVersionId: number, sortByFi: boolean) {
  const { features, feature_importance } = (await getSchemaApiV1ModelVersionsModelVersionIdSchemaGet(
    modelVersionId
  )) as FeaturesResponse;

  let featuresNames;
  if (sortByFi && feature_importance != null && Object.keys(feature_importance).length > 0) {
    featuresNames = Object.keys(feature_importance).sort((a, b) => feature_importance[b] - feature_importance[a]);
  } else {
    featuresNames = Object.keys(features).sort();
  }
  return {
    featuresNames: (featuresNames = featuresNames.filter(val => features?.[val] in ColumnType)),
    featureImportance: feature_importance
  };
}
