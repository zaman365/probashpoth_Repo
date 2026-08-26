import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotFoundError } from '@probash/domain';
import { CatalogueService } from './catalogue.service';

@ApiTags('catalogue')
@Controller()
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get('countries')
  async countries(
    @Query('purpose') purpose?: 'work' | 'study',
    @Query('withRoutes') withRoutes?: string,
  ) {
    return this.catalogue.listCountries({
      purpose,
      withRoutesOnly: withRoutes === 'true',
    });
  }

  @Get('countries/:code/routes')
  async countryRoutes(@Param('code') code: string, @Query('purpose') purpose?: string) {
    return this.catalogue.listRoutes({ countryCode: code.toUpperCase(), purpose });
  }

  @Get('routes')
  async routes(@Query('country') country?: string, @Query('purpose') purpose?: string) {
    return this.catalogue.listRoutes({
      countryCode: country?.toUpperCase(),
      purpose,
    });
  }

  @Get('routes/:id')
  async route(@Param('id') id: string) {
    return this.catalogue.getRoute(id);
  }

  @Get('countries/:code/profile')
  async countryProfile(@Param('code') code: string) {
    const profile = await this.catalogue.getCountryProfile(code);
    if (!profile) throw new NotFoundError('country_profile', code.toUpperCase());
    return profile;
  }

  @Get('occupations')
  async occupations(@Query('q') q?: string) {
    return this.catalogue.listOccupations(q);
  }

  @Get('sources')
  async sources(@Query('country') country?: string) {
    return this.catalogue.listSources(country?.toUpperCase());
  }

  @Get('institutions')
  async institutions(@Query('country') country?: string) {
    return this.catalogue.listInstitutions(country?.toUpperCase());
  }

  @Get('courses')
  async courses(@Query('institution') institution?: string) {
    return this.catalogue.listCourses(institution);
  }
}
