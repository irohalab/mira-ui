import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResourceGroupComponent } from './resource-group.component';

describe('ResourceGroupComponent', () => {
  let component: ResourceGroupComponent;
  let fixture: ComponentFixture<ResourceGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceGroupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResourceGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
