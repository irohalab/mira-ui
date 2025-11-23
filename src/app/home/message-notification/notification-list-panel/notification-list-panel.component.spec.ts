import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationListPanelComponent } from './notification-list-panel.component';

describe('NotificationListPanelComponent', () => {
  let component: NotificationListPanelComponent;
  let fixture: ComponentFixture<NotificationListPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationListPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationListPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
