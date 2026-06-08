import { SourcePlugin } from '@ever-jobs/plugin';

import { Injectable, Logger } from '@nestjs/common';
import {
  IScraper, ScraperInputDto, JobResponseDto, JobPostDto, Site, LocationDto,
} from '@ever-jobs/models';
import { createHttpClient, decodeHtmlEntities, stripHtmlTags } from '@ever-jobs/common';

/**
 * Allen Control Systems — Defense robotics company building AI-powered autonomous counter-drone weapon systems..
 *
 * Allen Control Systems (ACS) is an Austin, Texas-based defense
 * robotics company that develops autonomous counter-drone weapon
 * systems for U.S. and allied forces. Its flagship Bullfrog product
 * line uses AI, computer vision, and robotic fire control to detect,
 * track, and engage small unmanned aircraft. The company was founded
 * by Mike Wior, Steve Simoni, and Luke Allen, and manufactures its
 * systems in Austin. Hiring spans Engineering, Manufacturing, Supply
 * Chain, Quality, and Business Operations, including roles such as
 * Advanced Drone Operator and Buyer.
 *
 * Sector: Defense Technology / Robotics. HQ: Austin, TX, USA.
 *
 * Highlights:
 *   - Flagship Bullfrog product line: autonomous robotic fire-control
 *     systems for countering small drones (C-sUAS)
 *   - Uses AI, computer vision, and electro-optical/infrared sensing
 *     to detect, track, and engage aerial threats
 *   - Headquartered and manufacturing in Austin, TX, with both on-site
 *     and remote roles
 *   - Hiring across Engineering, Manufacturing, Supply Chain, Quality,
 *     and Business Operations, including hardware/production and
 *     procurement positions
 *
 * Source profile (Spec 233):
 *   - D-04 — Greenhouse canonical hosted-board host (variant 2):
 *     `https://job-boards.greenhouse.io/allencontrolsystems/jobs/<id>`.
 *   - D-08 — entity-decode-then-tag-strip description pipeline.
 *   - D-09 — wire `company_name` pass-through (`'Allen Control Systems'`).
 *   - D-10 — defensive `.trim()` on wire titles (padding observed
 *     on the run-398 batch probe).
 *   - D-11 — defensive `.trim()` on wire department names.
 *
 * Probed 68 live role(s) on the run-398 batch sweep.
 */
const API_URL = 'https://api.greenhouse.io/v1/boards/allencontrolsystems/jobs';

@SourcePlugin({
  site: Site.ALLENCONTROLSYSTEMS,
  name: 'Allen Control Systems',
  category: 'company',
})
@Injectable()
export class AllencontrolsystemsService implements IScraper {
  private readonly logger = new Logger(AllencontrolsystemsService.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const jobs: JobPostDto[] = [];
    const resultsWanted = input.resultsWanted ?? 50;

    try {
      const client = createHttpClient({
        proxies: input.proxies,
        timeout: input.requestTimeout ?? 30,
      });

      const url = `${API_URL}?content=true`;
      this.logger.log(`Allen Control Systems: fetching ${url}`);

      const { data } = await client.get<any>(url);
      const listings = data?.jobs ?? [];

      for (const listing of listings) {
        if (jobs.length >= resultsWanted) break;

        // D-10: defensive trim of wire title padding.
        const title = (listing.title ?? '').trim();
        if (!title) continue;

        if (input.searchTerm) {
          const term = input.searchTerm.toLowerCase();
          const titleMatch = title.toLowerCase().includes(term);
          const deptMatch = (listing.departments?.[0]?.name ?? '')
            .toLowerCase()
            .includes(term);
          if (!titleMatch && !deptMatch) continue;
        }

        const jobId = listing.id ?? '';
        const id = `allencontrolsystems-${jobId}`;

        const locationStr = listing.location?.name ?? null;
        const location = locationStr
          ? new LocationDto({ city: locationStr })
          : null;

        if (input.location && locationStr) {
          if (!locationStr.toLowerCase().includes(input.location.toLowerCase())) continue;
        }

        // D-11: defensive trim of wire department padding.
        const deptRaw = listing.departments?.[0]?.name ?? null;
        const department = deptRaw ? deptRaw.trim() : null;

        jobs.push(
          new JobPostDto({
            id,
            site: Site.ALLENCONTROLSYSTEMS,
            title,
            // D-09 pass-through: wire `company_name`.
            companyName: listing.company_name ?? 'Allen Control Systems',
            // D-04: wire `absolute_url` flows through (variant 2).
            jobUrl:
              listing.absolute_url ??
              `https://job-boards.greenhouse.io/allencontrolsystems/jobs/${listing.id}`,
            location,
            description: listing.content
              ? stripHtmlTags(decodeHtmlEntities(listing.content))
              : null,
            datePosted: listing.updated_at ?? null,
            isRemote: locationStr?.toLowerCase().includes('remote') ?? false,
            department,
          }),
        );
      }

      this.logger.log(`Allen Control Systems: scraped ${jobs.length} jobs`);
    } catch (err: any) {
      this.logger.error(`Allen Control Systems scrape failed: ${err.message}`);
    }

    return { jobs };
  }
}
