import { SetMetadata } from '@nestjs/common';
import { FEATURE_KEY } from '../constants';

export const RequireFeature = (featureKey: string) => SetMetadata(FEATURE_KEY, featureKey);
