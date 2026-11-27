# Regenerates the import fixtures (made-up people). Needs python-docx and reportlab;
# the .pdf versions of the .docx files come from LibreOffice:
#   python3 make_fixtures.py && soffice --headless --convert-to pdf rahul.docx karan.docx
# alex_rendercv.pdf is example_CV.yaml rendered by RenderCV.
from docx import Document
from docx.shared import Pt
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit

# 1. Word resume, Indian QA style, real bullet lists
d = Document()
h = d.add_paragraph(); r = h.add_run('Rahul Verma'); r.bold = True; r.font.size = Pt(20)
d.add_paragraph('Software Test Engineer')
d.add_paragraph('Mohali, Punjab | +91 98140 12345 | rahul.verma@gmail.com | linkedin.com/in/rahulverma-qa')
def head(t):
    p = d.add_paragraph(); r = p.add_run(t); r.bold = True; r.font.size = Pt(13)
head('PROFESSIONAL SUMMARY')
d.add_paragraph('QA engineer with 4+ years of experience in manual and automation testing of web and mobile applications. Skilled in Selenium, Appium and API testing with Postman.')
head('WORK EXPERIENCE')
p = d.add_paragraph(); p.add_run('Infosys Ltd, Chandigarh').bold = True
d.add_paragraph('Senior Test Engineer | Jan 2022 - Present')
for t in ['Led regression testing for a banking app used by 2 lakh customers', 'Automated 300+ test cases with Selenium WebDriver and TestNG, cutting regression time by 60%', 'Reported and tracked bugs in Jira and worked with developers to close them before release']:
    d.add_paragraph(t, style='List Bullet')
p = d.add_paragraph(); p.add_run('TechMahindra, Pune').bold = True
d.add_paragraph('Test Engineer | July 2019 - Dec 2021')
for t in ['Tested Android and iOS apps manually across 20+ devices', 'Wrote API tests in Postman for 80 endpoints']:
    d.add_paragraph(t, style='List Bullet')
head('EDUCATION')
d.add_paragraph('B.Tech in Computer Science, Punjab Technical University, Jalandhar')
d.add_paragraph('2015 - 2019')
d.add_paragraph('Senior Secondary (12th), DAV Public School, Ludhiana, 2015')
head('TECHNICAL SKILLS')
d.add_paragraph('Testing: Manual Testing, Regression, Smoke, UAT')
d.add_paragraph('Tools: Selenium, Appium, Postman, Jira, TestRail')
d.add_paragraph('Languages: Java, SQL')
head('CERTIFICATIONS')
d.add_paragraph('ISTQB Certified Tester Foundation Level (2020)', style='List Bullet')
d.add_paragraph('AWS Cloud Practitioner (2023)', style='List Bullet')
head('Languages')
d.add_paragraph('English, Hindi, Punjabi')
d.save('rahul.docx')

# 2. reportlab PDF: Title Case headings, "Role at Company", hyphen bullets that wrap, comma skills, projects
c = canvas.Canvas('neha.pdf', pagesize=A4); W, H = A4; y = H - 60; L = 50
def line(t, size=10, font='Helvetica', x=L, dy=None):
    global y; c.setFont(font, size); c.drawString(x, y, t); y -= dy or size * 1.45
def bullet(t):
    global y
    parts = simpleSplit(t, 'Helvetica', 10, W - L - 70)
    c.setFont('Helvetica', 10); c.drawString(L + 6, y, '-')
    for i, p in enumerate(parts):
        c.drawString(L + 16, y, p); y -= 14
line('NEHA KAPOOR', 22, 'Helvetica-Bold', dy=28)
line('Frontend Developer  ·  neha.kapoor@outlook.com  ·  +91-9876501234  ·  github.com/nehak  ·  nehakapoor.dev', 9, dy=26)
line('Summary', 13, 'Helvetica-Bold', dy=18)
for t in simpleSplit('Frontend developer who builds fast, accessible React apps. Five years shipping dashboards and design systems for fintech and edtech startups.', 'Helvetica', 10, W - 2*L):
    line(t)
y -= 8
line('Experience', 13, 'Helvetica-Bold', dy=18)
line('Senior Frontend Developer at Razorpay', 11, 'Helvetica-Bold')
line('March 2021 – Present  ·  Bengaluru', 9, 'Helvetica-Oblique')
bullet('Rebuilt the merchant dashboard in React and TypeScript, improving page load times by 45 percent for over a million merchants across India')
bullet('Created a shared component library used by six product teams, with Storybook docs and visual regression tests')
y -= 6
line('Frontend Developer at Byju\'s', 11, 'Helvetica-Bold')
line('June 2018 – February 2021  ·  Bengaluru', 9, 'Helvetica-Oblique')
bullet('Built interactive quiz screens used by 3M students every month')
y -= 8
line('Projects', 13, 'Helvetica-Bold', dy=18)
line('Expense Tracker — React, Firebase', 11, 'Helvetica-Bold')
bullet('Personal finance PWA with offline sync and charts, 2k users')
y -= 8
line('Education', 13, 'Helvetica-Bold', dy=18)
line('Master of Computer Applications, Delhi University', 11, 'Helvetica-Bold')
line('2016 – 2018', 9, 'Helvetica-Oblique')
y -= 8
line('Skills', 13, 'Helvetica-Bold', dy=18)
line('React, TypeScript, Next.js, Redux, Tailwind CSS, Jest, Cypress, Figma')
c.save()

# 3. two-column PDF: left sidebar (contact, skills, education), right main (summary, experience)
c = canvas.Canvas('amit2col.pdf', pagesize=A4); W, H = A4
c.setFont('Helvetica-Bold', 22); c.drawString(40, H - 60, 'Amit Singh')
c.setFont('Helvetica', 11); c.drawString(40, H - 80, 'Android Developer')
ly = H - 120; ry = H - 120; LX = 40; RX = 220
def l(t, f='Helvetica', s=9.5, gap=13):
    global ly; c.setFont(f, s); c.drawString(LX, ly, t); ly -= gap
def r(t, f='Helvetica', s=10, gap=14):
    global ry; c.setFont(f, s); c.drawString(RX, ry, t); ry -= gap
l('CONTACT', 'Helvetica-Bold', 11, 16); l('amit.singh@yahoo.in'); l('+91 99880 11223'); l('Panchkula, Haryana'); ly -= 10
l('SKILLS', 'Helvetica-Bold', 11, 16); 
for s in ['Kotlin', 'Java', 'Jetpack Compose', 'Retrofit', 'Room', 'Firebase']: l('• ' + s)
ly -= 10
l('EDUCATION', 'Helvetica-Bold', 11, 16); l('B.E. Electronics', 'Helvetica-Bold'); l('Chitkara University'); l('2014 – 2018')
r('PROFILE', 'Helvetica-Bold', 12, 18)
for t in simpleSplit('Android developer with 5 years of experience building consumer apps in Kotlin. Comfortable owning features from design to Play Store release.', 'Helvetica', 10, W - RX - 40): r(t)
ry -= 10
r('EXPERIENCE', 'Helvetica-Bold', 12, 18)
r('Paytm — Android Developer', 'Helvetica-Bold', 10.5)
r('Aug 2020 – Present, Noida', 'Helvetica-Oblique', 9)
for t in ['Shipped the new wallet onboarding flow to 50M users', 'Moved 40 screens from XML layouts to Jetpack Compose']: r('• ' + t)
ry -= 6
r('Quark Software — Junior Android Developer', 'Helvetica-Bold', 10.5)
r('Jul 2018 – Jul 2020, Mohali', 'Helvetica-Oblique', 9)
r('• Built offline-first field sales app used by 800 reps')
c.save()

# 4. plain text
open('simran.txt','w').write("""Simran Kaur
HR Executive
simran.kaur@example.com
+91 90000 11111
Ludhiana

OBJECTIVE
To grow as an HR professional in a people-first company.

EXPERIENCE
HR Executive, Vardhman Textiles — Ludhiana
04/2021 - present
* Handled hiring for 120+ factory and office roles a year
* Ran onboarding and monthly payroll inputs for 600 employees

EDUCATION
MBA (HR), Punjab University, 2021
BBA, GGDSD College, Chandigarh, 2019

SKILLS
Recruitment, Onboarding, Payroll, MS Excel, Employee Engagement
""")

# 5. messy Word resume: tables, personal details, declaration
d = Document()
p = d.add_paragraph(); r = p.add_run('KARAN MEHTA'); r.bold = True; r.font.size = Pt(18)
d.add_paragraph('Email: karan.mehta92@gmail.com    Mobile: 9876012345')
d.add_paragraph('Address: Sector 70, Mohali')
def head(t):
    p = d.add_paragraph(); r = p.add_run(t); r.bold = True
head('Career Objective:')
d.add_paragraph('Seeking a challenging position as a React Native developer where I can use my skills in mobile development and grow with the organization.')
head('Work Experience:')
d.add_paragraph('Smartdata Enterprises | React Native Developer | 06/2021 – Till Date')
d.add_paragraph('Developing cross-platform apps for healthcare and logistics clients.')
d.add_paragraph('Integrated Razorpay and Stripe payments in 4 apps', style='List Bullet')
d.add_paragraph('Set up CodePush for over-the-air updates', style='List Bullet')
d.add_paragraph('Netsol Technologies | Software Trainee | Jan 2020 – May 2021')
d.add_paragraph('Fixed UI bugs in a React web portal', style='List Bullet')
head('Internships')
d.add_paragraph('Android Intern, Webtunix AI, Mohali (Jun 2019 - Aug 2019)')
head('Educational Qualifications')
t = d.add_table(rows=4, cols=4)
for i, row in enumerate([('Qualification','Institute','Year','Score'),('B.Tech (CSE)','Chandigarh Group of Colleges, Landran','2016 - 2020','7.8 CGPA'),('12th','Govt. Model School, Mohali','2016','82%'),('10th','Govt. Model School, Mohali','2014','88%')]):
    for j, v in enumerate(row): t.cell(i, j).text = v
head('Key Skills')
for s in ['React Native, Redux, TypeScript', 'Firebase, REST APIs', 'Git, Jira']:
    d.add_paragraph(s, style='List Bullet')
head('Personal Details')
d.add_paragraph("Father's Name: Rajesh Mehta")
d.add_paragraph('Date of Birth: 12-03-1998')
d.add_paragraph('Languages Known: English, Hindi, Punjabi')
head('Declaration')
d.add_paragraph('I hereby declare that the above information is true to the best of my knowledge.')
d.add_paragraph('Place: Mohali')
d.save('karan.docx')
