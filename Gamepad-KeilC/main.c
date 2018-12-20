#include <stdio.h>
#include "NUC131.h"
#include <string.h>
#include "UART.h"
#include "TIMER.h"

#define PLLCON_SETTING  CLK_PLLCON_50MHz_HXT
#define PLL_CLOCK       50000000

int batdau=0, i=0, flag=0;
int clear_val = 0;
char data[100];
char t;
int data_send = 0, count4timer=0;
char *atstart = "AT+CIPSTART=\"TCP\",\"3.0.18.199\",6789\r\n";//192.168.43.103//ip cua lap

void SYS_Init(void);
void pwm_out(int val);
void start_timer();
void stop_timer();
void stop_pwm();
void UART0_Init(void);
void UART1_Init(void);

void UART0_Init(void)
{
    /*---------------------------------------------------------------------------------------------------------*/
    /* Init UART                                                                                               */
    /*---------------------------------------------------------------------------------------------------------*/
    /* Reset UART0 */
    SYS->IPRSTC2 |=  SYS_IPRSTC2_UART0_RST_Msk;
    SYS->IPRSTC2 &= ~SYS_IPRSTC2_UART0_RST_Msk;

    /* Configure UART0 and set UART0 Baudrate */
    UART0->BAUD = UART_BAUD_MODE2 | UART_BAUD_MODE2_DIVIDER(__HXT, 115200);
    UART0->LCR = UART_WORD_LEN_8 | UART_PARITY_NONE | UART_STOP_BIT_1;
}

void UART1_Init(void)
{
    SYS->IPRSTC2 |=  SYS_IPRSTC2_UART1_RST_Msk;
    SYS->IPRSTC2 &= ~SYS_IPRSTC2_UART1_RST_Msk;

    /* Configure UART0 and set UART0 Baudrate */
    UART1->BAUD = UART_BAUD_MODE2 | UART_BAUD_MODE2_DIVIDER(__HXT, 115200);
    UART1->LCR = UART_WORD_LEN_8 | UART_PARITY_NONE | UART_STOP_BIT_1;
	UART_EnableInt(UART1, (UART_IER_RDA_IEN_Msk | UART_IER_TOUT_IEN_Msk));
}
void Send_String(UART_T* uart, char *String)
{
	while(*String)
		if (UART_IS_TX_EMPTY(uart))
			{
				UART_WRITE(uart,*String);
				String++;
			}
}

void UART1_IRQHandler(void)
{
	
  volatile uint32_t u32IntSts = UART1->ISR;
	
	//printf("Co vao ngat uart1\n");
    /* Rx Ready or Time-out INT */
    if(UART_GET_INT_FLAG(UART1, UART_ISR_RDA_INT_Msk) ||  UART_GET_INT_FLAG(UART1, UART_ISR_TOUT_INT_Msk))
    {
        /* Handle received data */
        t = UART_READ(UART1);	
				if(t==':') 
				{
					batdau=1;
					return;
				}				
				if(batdau==1) 
				{
					data[i] =t;
					i++;
					if (t=='.') {//Dung nhan chuoi ky tu
						if(data[0]=='b' && data[1]=='a' && data[2]=='n' && data[3]=='t')
						{
							Send_String(UART0, "Ban trung\n");
							start_timer();
							//pwm_out(395);//Ban trung thi sang 100% trong 1s
							PA5=1;
							flag=1;
							//count4timer=1;
						}
						else if(data[0]=='b' && data[1]=='i' && data[2]=='b' && data[3]=='a')
						{
							Send_String(UART0, "Bi ban trung\n");
							start_timer();
							//pwm_out(50);//Bi ban trung thi sang 50% trong 0.5s
							PA5=1;
							flag=2;
							//count4timer=1;
						}
						i=0;
						batdau=0;//ket thuc nhan chuoi ten;
						Send_String(UART0, data);
						for(clear_val =0 ; clear_val<100; clear_val++) {
							data[clear_val] = '\0';
						}
					}
					return;
				}
		}
}

void Delay_us(uint32_t us){
	 uint32_t temp;
	 temp = us * 6; // cho 24 MHZ
	 while(temp > 0)
	 {
		 temp --;
	 }
 }

void SYS_Init(void) {
    /* Enable Internal RC 22.1184MHz clock */
    CLK->PWRCON |= CLK_PWRCON_OSC22M_EN_Msk;

    /* Waiting for Internal RC clock ready */
    while(!(CLK->CLKSTATUS & CLK_CLKSTATUS_OSC22M_STB_Msk));

    /* Switch HCLK clock source to Internal RC and HCLK source divide 1 */
    CLK->CLKSEL0 = (CLK->CLKSEL0 & (~CLK_CLKSEL0_HCLK_S_Msk)) | CLK_CLKSEL0_HCLK_S_HIRC;
    CLK->CLKDIV = (CLK->CLKDIV & (~CLK_CLKDIV_HCLK_N_Msk)) | CLK_CLKDIV_HCLK(1);

    /* Set PLL to Power-down mode */
    CLK->PLLCON |= CLK_PLLCON_PD_Msk;     
    
    /* Enable external XTAL 12MHz clock */
    CLK->PWRCON |= CLK_PWRCON_XTL12M_EN_Msk;

    /* Waiting for external XTAL clock ready */
    while(!(CLK->CLKSTATUS & CLK_CLKSTATUS_XTL12M_STB_Msk));

    /* Set core clock as PLL_CLOCK from PLL */
    CLK->PLLCON = PLLCON_SETTING;
    while(!(CLK->CLKSTATUS & CLK_CLKSTATUS_PLL_STB_Msk));
    CLK->CLKSEL0 = (CLK->CLKSEL0 & (~CLK_CLKSEL0_HCLK_S_Msk)) | CLK_CLKSEL0_HCLK_S_PLL;

    /* Update System Core Clock */
    /* User can use SystemCoreClockUpdate() to calculate PllClock, SystemCoreClock and CycylesPerUs automatically. */
    //SystemCoreClockUpdate();
    PllClock        = PLL_CLOCK;            // PLL
    SystemCoreClock = PLL_CLOCK / 1;        // HCLK
    CyclesPerUs     = PLL_CLOCK / 1000000;  // For SYS_SysTickDelay()

    /* Enable UART module clock */
    CLK->APBCLK |= CLK_APBCLK_UART0_EN_Msk|CLK_APBCLK_TMR0_EN_Msk;
		CLK->APBCLK |= CLK_APBCLK_UART1_EN_Msk;
		
    CLK->APBCLK1 |= CLK_APBCLK1_BPWM0_EN_Msk;

    /* Select UART module clock source */
    //CLK->CLKSEL1 = (CLK->CLKSEL1 & (~CLK_CLKSEL1_UART_S_Msk)) | CLK_CLKSEL1_UART_S_HXT;
		
		CLK->CLKSEL1 = (CLK->CLKSEL1 & (~CLK_CLKSEL1_UART_S_Msk)) | CLK_CLKSEL1_UART_S_HXT|CLK_CLKSEL1_TMR0_S_HXT;
		
    /* select BPWM clock source */
    CLK->CLKSEL3 = CLK_CLKSEL3_BPWM0_S_Msk;//|CLK_CLKSEL1_TMR0_S_HXT;

    /* Set GPB multi-function pins for UART0 RXD and TXD */
		
    SYS->GPB_MFP &= ~(SYS_GPB_MFP_PB0_Msk | SYS_GPB_MFP_PB1_Msk |
                      SYS_GPB_MFP_PB4_Msk | SYS_GPB_MFP_PB5_Msk);

    SYS->GPB_MFP |= (SYS_GPB_MFP_PB0_UART0_RXD | SYS_GPB_MFP_PB1_UART0_TXD |
                     SYS_GPB_MFP_PB4_UART1_RXD | SYS_GPB_MFP_PB5_UART1_TXD);
										 

    /* Set GPC multi-function pins for BPWM0 Channel 0 */
    SYS->GPC_MFP &= ~(SYS_GPC_MFP_PC0_Msk);
    SYS->GPC_MFP |= SYS_GPC_MFP_PC0_BPWM0_CH0;
    SYS->ALT_MFP3 &= ~(SYS_ALT_MFP3_PC0_Msk);
    SYS->ALT_MFP3 |= SYS_ALT_MFP3_PC0_BPWM0_CH0;

}

void gpio_init() {
	printf("Pa.0 used to test interrupt ......\n");

    /* Configure PB.3 as Input mode and enable interrupt by faling edge trigger */
    PA->PMD = (PA->PMD & (~GPIO_PMD_PMD0_Msk)) | (GPIO_PMD_INPUT << GPIO_PMD_PMD0_Pos);
    PA->IMD |= (GPIO_IMD_EDGE << 0);
    PA->IEN |= (BIT0 << GPIO_IEN_IR_EN_Pos);
    NVIC_EnableIRQ(GPAB_IRQn);
	
		PA->PMD = (PA->PMD & (~GPIO_PMD_PMD1_Msk)) | (GPIO_PMD_INPUT << GPIO_PMD_PMD1_Pos);
    PA->IMD |= (GPIO_IMD_EDGE << 1);
    PA->IEN |= (BIT1 << GPIO_IEN_IR_EN_Pos);
    NVIC_EnableIRQ(GPAB_IRQn);
		
		PA->PMD = (PA->PMD & (~GPIO_PMD_PMD2_Msk)) | (GPIO_PMD_INPUT << GPIO_PMD_PMD2_Pos);
    PA->IMD |= (GPIO_IMD_EDGE << 2);
    PA->IEN |= (BIT2 << GPIO_IEN_IR_EN_Pos);
    NVIC_EnableIRQ(GPAB_IRQn);
		
		PA->PMD = (PA->PMD & (~GPIO_PMD_PMD3_Msk)) | (GPIO_PMD_INPUT << GPIO_PMD_PMD3_Pos);
    PA->IMD |= (GPIO_IMD_EDGE << 3);
    PA->IEN |= (BIT3 << GPIO_IEN_IR_EN_Pos);
    NVIC_EnableIRQ(GPAB_IRQn);
		
		PA->PMD = (PA->PMD & (~GPIO_PMD_PMD4_Msk)) | (GPIO_PMD_INPUT << GPIO_PMD_PMD4_Pos);
    PA->IMD |= (GPIO_IMD_EDGE << 4);
    PA->IEN |= (BIT4 << GPIO_IEN_IR_EN_Pos);
    NVIC_EnableIRQ(GPAB_IRQn);
}

void TMR0_IRQHandler(void)
{
    if(TIMER_GetIntFlag(TIMER0) == 1)
    {
        /* Clear Timer0 time-out interrupt flag */
				count4timer++;
        TIMER_ClearIntFlag(TIMER0);
				if(flag==1) {
					
					if(count4timer==3) {
						count4timer=0;
						PA5=0;
						flag=0;
						stop_timer();
					}
				}
				if(flag==2) {
					//PA5=1;
					if(count4timer==1) {
						count4timer=0;
						PA5=0;
						flag=0;
						stop_timer();
					}
				}
   
    }
}

void GPAB_IRQHandler(void)
{
    /* To check if PB.3 interrupt occurred */

    if(GPIO_GET_INT_FLAG(PA, BIT0))
    {
				data_send = 2;
        GPIO_CLR_INT_FLAG(PA, BIT0);
        //printf("PA.0 INT occurred.\n");
			//Send_String(UART1, "PA.0 INT occurred.\n");
    }
		 else if(GPIO_GET_INT_FLAG(PA, BIT1))
    {
				data_send = 4;
        GPIO_CLR_INT_FLAG(PA, BIT1);
        //printf("PA.1 INT occurred.\n");
    }
		else  if(GPIO_GET_INT_FLAG(PA, BIT2))
    {
				data_send = 8;
        GPIO_CLR_INT_FLAG(PA, BIT2);
        //printf("PA.2 INT occurred.\n");
    }
		 else if(GPIO_GET_INT_FLAG(PA, BIT3))
    {
				data_send = 6;
        GPIO_CLR_INT_FLAG(PA, BIT3);
        //printf("PA.3 INT occurred.\n");
    }
		else  if(GPIO_GET_INT_FLAG(PA, BIT4))
    {
				data_send = 5;
        GPIO_CLR_INT_FLAG(PA, BIT4);
        //printf("PA.4 INT occurred.\n");
    }
    
}

void pwm_timer_init() {
		BPWM0->CTL1 &= ~BPWM_CTL1_CNTTYPE0_Msk;
    BPWM0->CTL1 |= 0x1;

    /*Set BPWM Timer clock prescaler*/
    BPWM_SET_PRESCALER(BPWM0, 0, 0); // Divided by 1

    /*Set BPWM Timer duty*/
    BPWM_SET_CMR(BPWM0, 0, 1);//199

    /*Set BPWM Timer period*/
    BPWM_SET_CNR(BPWM0, 0, 399);

    /* Set waveform generation */
    BPWM0->WGCTL0 = 0x10000;
    BPWM0->WGCTL1 = 0x20000;

    // Enable output of BPWM0 channel 0
    BPWM0->POEN |= BPWM_POEN_POEN0_Msk;
		
		 /* Open Timer0 in periodic mode, enable interrupt and 1 interrupt tick per second */
    TIMER0->TCMPR = __HXT;
    TIMER0->TCSR = TIMER_TCSR_IE_Msk | TIMER_PERIODIC_MODE;
    TIMER_SET_PRESCALE_VALUE(TIMER0, 0);//0
		
		/* Enable Timer0 NVIC */
    NVIC_EnableIRQ(TMR0_IRQn);
		
		 /* Start Timer0 counting */
    //TIMER_Start(TIMER0);
		TIMER_Stop(TIMER0);
    // Start
    //BPWM0->CNTEN |= BPWM_CNTEN_CNTEN0_Msk;
}

void pwm_out(int val) {
	 /*Set BPWM Timer duty*/
    BPWM_SET_CMR(BPWM0, 0, val);//199

    /*Set BPWM Timer period*/
    BPWM_SET_CNR(BPWM0, 0, 399);
		BPWM0->CNTEN |= BPWM_CNTEN_CNTEN0_Msk;
}

void stop_pwm() {
	 BPWM_SET_CMR(BPWM0, 0, 0);//199

    /*Set BPWM Timer period*/
    //BPWM_SET_CNR(BPWM0, 0, 399);
	BPWM0->POEN &= ~BPWM_POEN_POEN0_Msk;
	BPWM0->CNTEN &= ~BPWM_CNTEN_CNTEN0_Msk;
}

void start_timer() {
		TIMER_Start(TIMER0);
}

void stop_timer() {
		TIMER_Stop(TIMER0);
}

int main(void) {
	/* Unlock protected registers */
	SYS_UnlockReg();
	/* Init System, peripheral clock and multi-function I/O */
	SYS_Init();
	/* Lock protected registers */
	SYS_LockReg();
	/* Init UART0 for printf and testing */
	UART0_Init();
	UART1_Init();
	gpio_init();
	pwm_timer_init();
	
	 //PA->PMD = (PA->PMD & (~GPIO_PMD_PMD2_Msk)) | (GPIO_PMD_OUTPUT << GPIO_PMD_PMD2_Pos);
	PA->PMD = (PA->PMD & (~GPIO_PMD_PMD5_Msk)) | (GPIO_PMD_OUTPUT << GPIO_PMD_PMD5_Pos);
	PA5=0;
	//pwm_out(1);
	
	//Send_String(UART0,"OK 10\n");
	Send_String(UART0, "HIi\n");
	Send_String(UART1,atstart);
	Delay_us(2000);
	
	Send_String(UART1, "AT+CIPSEND=13\r\n");
	Delay_us(1000);
	Send_String(UART1,"verify-ngoc12\r\n");
	Delay_us(3000);
	
	while(1){
		if(data_send==2) {
			Send_String(UART1, "AT+CIPSEND=10\r\n");
			Delay_us(100);
			Send_String(UART1, "ngoc12-2\r\n");
			Delay_us(700);
			data_send=0;
		}
		else if(data_send==4) {
			Send_String(UART1, "AT+CIPSEND=10\r\n");
			Delay_us(1000);
			Send_String(UART1, "ngoc12-4\r\n");
			Delay_us(7000);
			data_send=0;
		} else if(data_send==6) {
			Send_String(UART1, "AT+CIPSEND=10\r\n");
			Delay_us(1000);
			Send_String(UART1, "ngoc12-6\r\n");
			Delay_us(7000);
			data_send=0;
		} else if(data_send==8) {
			Send_String(UART1, "AT+CIPSEND=10\r\n");
			Delay_us(1000);
			Send_String(UART1, "ngoc12-8\r\n");
			Delay_us(7000);
			data_send=0;
		} else if(data_send==5) {
			Send_String(UART1, "AT+CIPSEND=10\r\n");
			Delay_us(1000);
			Send_String(UART1, "ngoc12-5\r\n");
			Delay_us(7000);
			data_send=0;
		} 
	};
}