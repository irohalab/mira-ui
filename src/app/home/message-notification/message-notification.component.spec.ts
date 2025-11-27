import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageNotificationComponent } from './message-notification.component';

describe('MessageNotificationComponent', () => {
  let component: MessageNotificationComponent;
  let fixture: ComponentFixture<MessageNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageNotificationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessageNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
