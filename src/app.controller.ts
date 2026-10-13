import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

// Read version safely from package.json
let appVersion = '1.1.0';
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require('../package.json');
  if (pkg && pkg.version) {
    appVersion = pkg.version;
  }
} catch {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../package.json');
    if (pkg && pkg.version) {
      appVersion = pkg.version;
    }
  } catch {
    // default fallback
  }
}

const buildTime = process.env.BUILD_TIME || new Date().toISOString();

@ApiTags('Root')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'اطلاعات و وضعیت ریشه پلتفرم رکاد' })
  getRoot() {
    return {
      name: 'Rokad Multi-Tenant Platform API',
      version: appVersion,
      description: 'سامانه چندمستأجری مدیریت مدارس رُکاد (School ERP & LMS)',
      docs: '/api/docs',
      health: '/api/v1/health',
      versionEndpoint: '/api/v1/version',
      endpoints: {
        auth: '/api/v1/auth',
        tenants: '/api/v1/tenants',
        featureFlags: '/api/v1/feature-flags',
        health: '/api/v1/health',
      },
    };
  }

  @Public()
  @Get('version')
  @ApiOperation({ summary: 'استعلام شماره نسخه فعال، تاریخ بیلد و وضعیت انتشار پلتفرم' })
  getVersion() {
    return {
      version: appVersion,
      buildTime,
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
