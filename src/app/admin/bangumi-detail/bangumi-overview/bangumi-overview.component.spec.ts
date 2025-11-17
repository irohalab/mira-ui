import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BangumiOverviewComponent } from './bangumi-overview.component';

describe('BangumiOverviewComponent', () => {
  let component: BangumiOverviewComponent;
  let fixture: ComponentFixture<BangumiOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BangumiOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BangumiOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
